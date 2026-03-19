-- ============================================================
-- Migration 006: Add payment history to get_public_invoice_data
--
-- Extends the public invoice RPC to also return:
--   • payment_history – array of all invoices for this client
--   • latest reliability score label
-- ============================================================

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
  v_agg_score          INT;
  v_has_history        BOOLEAN;
  v_commitment_status  TEXT;
  v_commitment_type    TEXT;
  v_payment_history    JSONB;
  v_score_label        TEXT;
BEGIN
  SELECT * INTO v_invoice FROM public.invoices WHERE number = p_invoice_number LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_client  FROM public.clients  WHERE id = v_invoice.client_id LIMIT 1;
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_invoice.user_id   LIMIT 1;

  -- Use invoice banking snapshot if populated, otherwise fall back to banking_details table
  IF v_invoice.banking_details IS NULL OR v_invoice.banking_details = '{}'::jsonb THEN
    SELECT * INTO v_banking
      FROM public.banking_details
     WHERE user_id = v_invoice.user_id AND is_primary = TRUE
     LIMIT 1;
    IF FOUND THEN
      v_banking_json := jsonb_build_object(
        'bank',    v_banking.bank_name,
        'account', v_banking.account_number,
        'branch',  v_banking.branch_code,
        'type',    v_banking.account_type,
        'holder',  v_banking.account_holder
      );
    ELSE
      v_banking_json := '{}'::jsonb;
    END IF;
  ELSE
    v_banking_json := v_invoice.banking_details;
  END IF;

  -- Behaviour-based score (same logic as before)
  SELECT GREATEST(0, LEAST(100,
    CASE WHEN v_client.relationship_type = 'recurring' THEN 70 ELSE 60 END
    + COALESCE(SUM(
        CASE
          WHEN i.status = 'paid'
               AND cm.id IS NULL
               AND i.paid_date IS NOT NULL
               AND i.paid_date::date <= i.due_date THEN 10
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status = 'approved' THEN 8
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status = 'completed' THEN 6
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status NOT IN ('approved','completed') THEN 3
          WHEN i.status = 'paid'
               AND cm.id IS NULL
               AND (i.paid_date IS NULL OR i.paid_date::date > i.due_date) THEN -4
          WHEN i.status = 'project_completed'
               AND cm.id IS NOT NULL
               AND cm.type = 'project_completion'
               AND (CURRENT_DATE - i.due_date) >= COALESCE((cm.details->>'followup_days')::int, 3) THEN -10
          WHEN i.status = 'project_completed'
               AND (CURRENT_DATE - i.due_date) >= 3 THEN -4
          WHEN i.status = 'overdue'
               AND cm.id IS NOT NULL
               AND cm.status IN ('pending','declined','cancelled') THEN -10
          ELSE 0
        END
      ), 0)
    + COALESCE((
        SELECT COUNT(*)
          FROM public.commitments ec
          JOIN public.clients ec_c ON ec_c.id = ec.client_id
         WHERE LOWER(TRIM(ec_c.name)) = LOWER(TRIM(v_client.name))
           AND ec.type = 'extension'
      ), 0)
  ))::INT
    INTO v_agg_score
    FROM public.invoices i
    JOIN public.clients c ON c.id = i.client_id
    LEFT JOIN LATERAL (
      SELECT id, status, type, details
        FROM public.commitments cm2
       WHERE cm2.invoice_id = i.id
       ORDER BY cm2.requested_at DESC
       LIMIT 1
    ) cm ON TRUE
   WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(v_client.name))
     AND c.name IS NOT NULL AND TRIM(c.name) != '';

  -- Derive score label
  v_agg_score := COALESCE(v_agg_score, 60);
  IF v_agg_score >= 85 THEN v_score_label := 'Excellent';
  ELSIF v_agg_score >= 70 THEN v_score_label := 'Good';
  ELSIF v_agg_score >= 50 THEN v_score_label := 'Average';
  ELSIF v_agg_score >= 30 THEN v_score_label := 'Below Average';
  ELSE v_score_label := 'Unreliable';
  END IF;

  -- Fetch the latest commitment on this specific invoice
  SELECT cm.status, cm.type
    INTO v_commitment_status, v_commitment_type
    FROM public.commitments cm
   WHERE cm.invoice_id = v_invoice.id
   ORDER BY cm.requested_at DESC
   LIMIT 1;

  -- New = no invoices at all for this client name
  SELECT EXISTS(
    SELECT 1
      FROM public.invoices i
      JOIN public.clients c ON c.id = i.client_id
     WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(v_client.name))
       AND c.name IS NOT NULL AND TRIM(c.name) != ''
     LIMIT 1
  ) INTO v_has_history;

  -- Build payment history array (all invoices for this client, newest first)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'number',    i.number,
      'amount',    i.amount,
      'status',    i.status,
      'due_date',  i.due_date,
      'paid_date', i.paid_date,
      'created_at', i.created_at
    ) ORDER BY i.created_at DESC
  ), '[]'::jsonb)
    INTO v_payment_history
    FROM public.invoices i
    JOIN public.clients c ON c.id = i.client_id
   WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(v_client.name))
     AND c.name IS NOT NULL AND TRIM(c.name) != '';

  RETURN jsonb_build_object(
    'invoice_id',          v_invoice.id,
    'user_id',             v_invoice.user_id,
    'client_id',           v_invoice.client_id,
    'number',              v_invoice.number,
    'amount',              v_invoice.amount,
    'due_date',            v_invoice.due_date,
    'status',              v_invoice.status,
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
