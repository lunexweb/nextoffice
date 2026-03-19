-- ============================================================
-- Migration 007: get_client_score RPC
--
-- Server-side score computation by client_id (stable UUID).
-- Returns JSONB with: score, score_label, level
-- Called by edge functions so emails always show correct score.
-- Also updates get_public_invoice_data to use client_id matching.
-- ============================================================

-- 1) Standalone score RPC
CREATE OR REPLACE FUNCTION public.get_client_score(p_client_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client  public.clients%ROWTYPE;
  v_score   INT;
  v_label   TEXT;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('score', 60, 'score_label', 'New', 'level', 'New');
  END IF;

  SELECT GREATEST(0, LEAST(100,
    CASE WHEN v_client.relationship_type = 'recurring' THEN 70 ELSE 60 END
    + COALESCE(SUM(
        CASE
          WHEN i.status = 'paid' AND cm.id IS NULL AND i.paid_date IS NOT NULL AND i.paid_date::date <= i.due_date THEN 10
          WHEN i.status = 'paid' AND cm.id IS NOT NULL AND cm.status = 'approved' THEN 8
          WHEN i.status = 'paid' AND cm.id IS NOT NULL AND cm.status = 'completed' THEN 6
          WHEN i.status = 'paid' AND cm.id IS NOT NULL AND cm.status NOT IN ('approved','completed') THEN 3
          WHEN i.status = 'paid' AND cm.id IS NULL AND (i.paid_date IS NULL OR i.paid_date::date > i.due_date) THEN -4
          WHEN i.status = 'project_completed' AND cm.id IS NOT NULL AND cm.type = 'project_completion'
               AND (CURRENT_DATE - i.due_date) >= COALESCE((cm.details->>'followup_days')::int, 3) THEN -10
          WHEN i.status = 'project_completed' AND (CURRENT_DATE - i.due_date) >= 3 THEN -4
          WHEN i.status = 'overdue' AND cm.id IS NOT NULL AND cm.status IN ('pending','declined','cancelled') THEN -10
          ELSE 0
        END
      ), 0)
    + COALESCE((
        SELECT COUNT(*) FROM public.commitments ec
        WHERE ec.client_id = p_client_id AND ec.type = 'extension'
      ), 0)
  ))::INT
    INTO v_score
    FROM public.invoices i
    LEFT JOIN LATERAL (
      SELECT id, status, type, details FROM public.commitments cm2
      WHERE cm2.invoice_id = i.id ORDER BY cm2.requested_at DESC LIMIT 1
    ) cm ON TRUE
    WHERE i.client_id = p_client_id;

  v_score := COALESCE(v_score, 60);

  IF v_score >= 85 THEN v_label := 'Excellent';
  ELSIF v_score >= 70 THEN v_label := 'Good';
  ELSIF v_score >= 50 THEN v_label := 'Average';
  ELSIF v_score >= 30 THEN v_label := 'Below Average';
  ELSE v_label := 'Unreliable';
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'score_label', v_label,
    'level', COALESCE(v_client.level, 'New')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_score(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_score(UUID) TO service_role;


-- 2) Update get_public_invoice_data to use client_id matching instead of name
CREATE OR REPLACE FUNCTION public.get_public_invoice_data(p_invoice_number TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice      public.invoices%ROWTYPE;
  v_client       public.clients%ROWTYPE;
  v_profile      public.profiles%ROWTYPE;
  v_banking      public.banking_details%ROWTYPE;
  v_banking_json JSONB;
  v_score_data   JSONB;
  v_agg_score    INT;
  v_score_label  TEXT;
  v_has_history  BOOLEAN;
  v_commitment_status  TEXT;
  v_commitment_type    TEXT;
  v_payment_history    JSONB;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE number = p_invoice_number LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_client  FROM public.clients  WHERE id = v_invoice.client_id LIMIT 1;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_invoice.user_id   LIMIT 1;

  -- Banking details
  IF v_invoice.banking_details IS NULL OR v_invoice.banking_details = '{}'::jsonb THEN
    SELECT * INTO v_banking FROM public.banking_details
     WHERE user_id = v_invoice.user_id AND is_primary = TRUE LIMIT 1;
    IF FOUND THEN
      v_banking_json := jsonb_build_object(
        'bank', v_banking.bank_name, 'account', v_banking.account_number,
        'branch', v_banking.branch_code, 'type', v_banking.account_type,
        'holder', v_banking.account_holder
      );
    ELSE v_banking_json := '{}'::jsonb; END IF;
  ELSE
    v_banking_json := v_invoice.banking_details;
  END IF;

  -- Use the shared get_client_score function (matches by client_id)
  v_score_data := public.get_client_score(v_invoice.client_id);
  v_agg_score := (v_score_data->>'score')::INT;
  v_score_label := v_score_data->>'score_label';

  -- Latest commitment on this invoice
  SELECT cm.status, cm.type INTO v_commitment_status, v_commitment_type
    FROM public.commitments cm WHERE cm.invoice_id = v_invoice.id
    ORDER BY cm.requested_at DESC LIMIT 1;

  -- Has any invoice history
  SELECT EXISTS(
    SELECT 1 FROM public.invoices i WHERE i.client_id = v_invoice.client_id LIMIT 1
  ) INTO v_has_history;

  -- Payment history (all invoices for this client_id, newest first)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'number', i.number, 'amount', i.amount, 'status', i.status,
      'due_date', i.due_date, 'paid_date', i.paid_date, 'created_at', i.created_at
    ) ORDER BY i.created_at DESC
  ), '[]'::jsonb)
    INTO v_payment_history
    FROM public.invoices i WHERE i.client_id = v_invoice.client_id;

  RETURN jsonb_build_object(
    'invoice_id',          v_invoice.id,
    'user_id',             v_invoice.user_id,
    'client_id',           v_invoice.client_id,
    'number',              v_invoice.number,
    'amount',              v_invoice.amount,
    'due_date',            v_invoice.due_date,
    'status',              v_invoice.status,
    'paid_date',           v_invoice.paid_date,
    'notes',               v_invoice.notes,
    'line_items',          COALESCE(v_invoice.line_items, '[]'::jsonb),
    'banking_details',     v_banking_json,
    'client_name',         v_client.name,
    'client_score',        v_agg_score,
    'client_level',        COALESCE(v_client.level, 'New'),
    'score_label',         v_score_label,
    'has_history',         v_has_history,
    'payment_history',     v_payment_history,
    'business_name',       COALESCE(v_profile.business_name, ''),
    'business_email',      COALESCE(v_profile.email, ''),
    'business_phone',      COALESCE(v_profile.phone, ''),
    'business_address',    COALESCE(v_profile.address || ', ' || v_profile.city, ''),
    'negotiation_options', COALESCE(v_invoice.negotiation_options, '{}'::jsonb),
    'commitment_status',   v_commitment_status,
    'commitment_type',     v_commitment_type
  );
END;
$$;
