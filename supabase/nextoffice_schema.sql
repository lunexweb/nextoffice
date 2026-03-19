-- ============================================================
-- NextOffice — Complete Supabase Schema + RLS
-- Copy & paste this entire file into the Supabase SQL Editor
-- Run it once. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE 1: profiles
-- One row per authenticated user (business owner)
-- Auto-created by trigger on auth.users insert
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                     TEXT NOT NULL,
  first_name                TEXT,
  last_name                 TEXT,
  phone                     TEXT,
  business_name             TEXT,
  business_type             TEXT,
  description               TEXT,
  website                   TEXT,
  address                   TEXT,
  city                      TEXT,
  province                  TEXT,
  postal_code               TEXT,
  country                   TEXT DEFAULT 'South Africa',
  invoice_prefix            TEXT DEFAULT 'INV',
  invoice_start_number      INT  DEFAULT 1001,
  quote_prefix              TEXT DEFAULT 'QUO',
  quote_start_number        INT  DEFAULT 2001,
  default_due_days          INT  DEFAULT 30,
  payment_terms             TEXT DEFAULT 'Payment due within 30 days of invoice date.',
  vat_enabled               BOOLEAN DEFAULT FALSE,
  vat_percentage            NUMERIC(5,2) DEFAULT 15,
  vat_number                TEXT,
  currency                  TEXT DEFAULT 'ZAR',
  late_payment_interest     NUMERIC(5,2) DEFAULT 2,
  late_payment_enabled      BOOLEAN DEFAULT FALSE,
  deposit_enabled           BOOLEAN DEFAULT FALSE,
  default_deposit_percentage NUMERIC(5,2) DEFAULT 30,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 2: user_roles
-- Distinguishes ceo / admin / user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'ceo')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);


-- ============================================================
-- TABLE 3: subscriptions
-- Managed by CEO dashboard — tracks each user's payment status
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','paused','pending','cancelled')),
  subscription_start_date  DATE,
  subscription_end_date    DATE,
  billing_cycle_days       INT  DEFAULT 30,
  last_payment_date        DATE,
  next_payment_date        DATE,
  notes                    TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);


-- ============================================================
-- TABLE 4: access_requests
-- Public insert (landing page waitlist form)
-- Read/update by CEO only
-- ============================================================
CREATE TABLE IF NOT EXISTS public.access_requests (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email            TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  company          TEXT,
  phone            TEXT,
  message          TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  processed_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 5: banking_details
-- Banking info per user (used as snapshot on invoices)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.banking_details (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_name        TEXT NOT NULL,
  account_number   TEXT NOT NULL,
  account_holder   TEXT NOT NULL,
  branch_code      TEXT,
  account_type     TEXT DEFAULT 'current',
  swift_code       TEXT,
  is_primary       BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 6: clients
-- Each business owner's client list
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  postal_code TEXT,
  client_type       TEXT DEFAULT 'individual' CHECK (client_type IN ('individual','business')),
  relationship_type TEXT DEFAULT 'once_off'   CHECK (relationship_type IN ('once_off','recurring')),
  score             INT  DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  level       TEXT DEFAULT 'New',
  status      TEXT DEFAULT 'active' CHECK (status IN ('active','inactive')),
  color       TEXT DEFAULT 'muted' CHECK (color IN ('green','amber','red','blue','muted')),
  slug        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);


-- ============================================================
-- TABLE 7: client_notes
-- Internal notes on a client, written by the business owner
-- ============================================================
CREATE TABLE IF NOT EXISTS public.client_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  text       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- TABLE 8: invoices
-- Core invoice records
-- line_items and banking_details stored as JSONB snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  number           TEXT NOT NULL,
  amount           NUMERIC(12,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue','cancelled','project_completed')),
  due_date         DATE NOT NULL,
  paid_date        DATE,
  notes            TEXT,
  is_recurring     BOOLEAN DEFAULT FALSE,
  recurring_day    INT CHECK (recurring_day >= 1 AND recurring_day <= 31),
  line_items           JSONB NOT NULL DEFAULT '[]',
  banking_details      JSONB NOT NULL DEFAULT '{}',
  negotiation_options  JSONB DEFAULT NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, number)
);

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS negotiation_options JSONB DEFAULT NULL;


-- ============================================================
-- TABLE 9: commitments
-- Client submits via public link — no auth required for INSERT
-- Business owner reads/approves/declines
-- details JSONB shape varies by type:
--   deposit:       { depositPercentage, depositAmount, committedDate }
--   payment_plan:  { installments, installmentAmount, paymentSchedule[] }
--   extension:     { extensionDays, newDueDate }
--   already_paid:  { paymentDate, paymentProof }
-- ============================================================
CREATE TABLE IF NOT EXISTS public.commitments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name     TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('deposit','payment_plan','extension','already_paid','project_completion')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','declined','completed','cancelled')),
  amount          NUMERIC(12,2) NOT NULL,
  details         JSONB NOT NULL DEFAULT '{}',
  message         TEXT,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  responded_at    TIMESTAMPTZ
);


-- ============================================================
-- TABLE 10: communication_logs
-- Every email sent via the system (invoices, reminders, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id   UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id    UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  type         TEXT NOT NULL CHECK (type IN ('reminder','followup','confirmation','initial_invoice','payment_received','commitment_confirmation','welcome')),
  status       TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','delivered','opened','failed','bounced')),
  subject      TEXT NOT NULL,
  body         TEXT,
  sent_at      TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  opens        INT DEFAULT 0,
  clicks       INT DEFAULT 0
);


-- ============================================================
-- TABLE 11: reminder_settings
-- One row per user — their automation config
-- rules and email_templates stored as JSONB
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reminder_settings (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  automation_enabled        BOOLEAN DEFAULT TRUE,
  send_on_weekends          BOOLEAN DEFAULT FALSE,
  send_time                 TIME    DEFAULT '09:00',
  max_reminders_per_invoice INT     DEFAULT 3,
  stop_after_days           INT     DEFAULT 60,
  rules                     JSONB   NOT NULL DEFAULT '[]',
  email_templates           JSONB   NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);


-- ============================================================
-- INDEXES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clients_user_id          ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_slug             ON public.clients(slug);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id         ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id       ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status          ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_commitments_user_id      ON public.commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_commitments_invoice_id   ON public.commitments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commitments_status       ON public.commitments(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_user  ON public.communication_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_inv   ON public.communication_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id   ON public.client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON public.subscriptions(status);


-- ============================================================
-- HELPER FUNCTION: is_ceo()
-- Used in RLS policies for CEO-only tables
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_ceo()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'ceo'
  );
$$;


-- ============================================================
-- TRIGGER: auto-create profile + subscription + role on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'pending')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- TRIGGER: auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at         ON public.profiles;
DROP TRIGGER IF EXISTS set_banking_details_updated_at  ON public.banking_details;
DROP TRIGGER IF EXISTS set_clients_updated_at          ON public.clients;
DROP TRIGGER IF EXISTS set_invoices_updated_at         ON public.invoices;
DROP TRIGGER IF EXISTS set_subscriptions_updated_at    ON public.subscriptions;
DROP TRIGGER IF EXISTS set_reminder_settings_updated_at ON public.reminder_settings;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_banking_details_updated_at
  BEFORE UPDATE ON public.banking_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_reminder_settings_updated_at
  BEFORE UPDATE ON public.reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- ENABLE ROW LEVEL SECURITY on all tables
-- ============================================================
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banking_details    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_settings  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES: profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles: owner can read"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: owner can update" ON public.profiles;

CREATE POLICY "profiles: owner can read"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: owner can update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ============================================================
-- RLS POLICIES: user_roles
-- ============================================================
DROP POLICY IF EXISTS "user_roles: owner can read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles: ceo full access" ON public.user_roles;

CREATE POLICY "user_roles: owner can read"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_roles: ceo full access"
  ON public.user_roles FOR ALL
  USING (public.is_ceo());


-- ============================================================
-- RLS POLICIES: subscriptions
-- ============================================================
DROP POLICY IF EXISTS "subscriptions: owner can read"  ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: ceo full access" ON public.subscriptions;

CREATE POLICY "subscriptions: owner can read"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions: ceo full access"
  ON public.subscriptions FOR ALL
  USING (public.is_ceo());


-- ============================================================
-- RLS POLICIES: access_requests
-- Public INSERT (landing page waitlist), CEO full access
-- ============================================================
DROP POLICY IF EXISTS "access_requests: public can insert" ON public.access_requests;
DROP POLICY IF EXISTS "access_requests: ceo full access"   ON public.access_requests;

CREATE POLICY "access_requests: public can insert"
  ON public.access_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "access_requests: ceo full access"
  ON public.access_requests FOR ALL
  USING (public.is_ceo());


-- ============================================================
-- RLS POLICIES: banking_details
-- ============================================================
DROP POLICY IF EXISTS "banking_details: owner full access" ON public.banking_details;

CREATE POLICY "banking_details: owner full access"
  ON public.banking_details FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: clients
-- ============================================================
DROP POLICY IF EXISTS "clients: owner full access" ON public.clients;

CREATE POLICY "clients: owner full access"
  ON public.clients FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: client_notes
-- ============================================================
DROP POLICY IF EXISTS "client_notes: owner full access" ON public.client_notes;

CREATE POLICY "client_notes: owner full access"
  ON public.client_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: invoices
-- ============================================================
DROP POLICY IF EXISTS "invoices: owner full access" ON public.invoices;

CREATE POLICY "invoices: owner full access"
  ON public.invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: commitments
-- Public INSERT (client submits via commitment link — no auth)
-- Owner (business) can read, update, delete their own
-- ============================================================
DROP POLICY IF EXISTS "commitments: public can insert"  ON public.commitments;
DROP POLICY IF EXISTS "commitments: owner can read"     ON public.commitments;
DROP POLICY IF EXISTS "commitments: owner can update"   ON public.commitments;
DROP POLICY IF EXISTS "commitments: owner can delete"   ON public.commitments;

CREATE POLICY "commitments: public can insert"
  ON public.commitments FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "commitments: owner can read"
  ON public.commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "commitments: owner can update"
  ON public.commitments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "commitments: owner can delete"
  ON public.commitments FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: communication_logs
-- ============================================================
DROP POLICY IF EXISTS "comm_logs: owner full access" ON public.communication_logs;

CREATE POLICY "comm_logs: owner full access"
  ON public.communication_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RLS POLICIES: reminder_settings
-- ============================================================
DROP POLICY IF EXISTS "reminder_settings: owner full access" ON public.reminder_settings;

CREATE POLICY "reminder_settings: owner full access"
  ON public.reminder_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- RPC: get_public_invoice_data(p_invoice_number)
-- Public (no auth) — used by the client commitment page.
-- Returns invoice + banking + client data as JSON.
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

  -- Behaviour-based score. Matches src/utils/scoring.ts computeClientScore().
  -- Base: 70 if client has an active recurring invoice (is_recurring + status='sent'), else 60.
  -- +10 paid on time (no commitment), +8 owner-approved, +6 system-completed,
  -- +3 paid with uncommitted commitment, +1 per extension request,
  -- -4 paid late no communication, -10 broken commitment.
  -- Overdue with no commitment = neutral.
  -- Project completion: -4 after configured grace period, -10 if had project_completion commitment (reads followup_days from details JSONB).
  SELECT GREATEST(0, LEAST(100,
    CASE WHEN v_client.relationship_type = 'recurring' THEN 70 ELSE 60 END
    + COALESCE(SUM(
        CASE
          -- Paid on time, no commitment: +10
          WHEN i.status = 'paid'
               AND cm.id IS NULL
               AND i.paid_date IS NOT NULL
               AND i.paid_date::date <= i.due_date THEN 10
          -- Owner manually approved: +8
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status = 'approved' THEN 8
          -- System-completed commitment: +6
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status = 'completed' THEN 6
          -- Paid with commitment not formally completed: +3
          WHEN i.status = 'paid'
               AND cm.id IS NOT NULL
               AND cm.status NOT IN ('approved','completed') THEN 3
          -- Paid late, no commitment: -4
          WHEN i.status = 'paid'
               AND cm.id IS NULL
               AND (i.paid_date IS NULL OR i.paid_date::date > i.due_date) THEN -4
          -- Project completed past grace period, had project_completion commitment: -10
          WHEN i.status = 'project_completed'
               AND cm.id IS NOT NULL
               AND cm.type = 'project_completion'
               AND (CURRENT_DATE - i.due_date) >= COALESCE((cm.details->>'followup_days')::int, 3) THEN -10
          -- Project completed past grace period, no commitment: -4
          WHEN i.status = 'project_completed'
               AND (CURRENT_DATE - i.due_date) >= 3 THEN -4
          -- Overdue after a broken commitment: -10
          WHEN i.status = 'overdue'
               AND cm.id IS NOT NULL
               AND cm.status IN ('pending','declined','cancelled') THEN -10
          -- Overdue with no commitment or unresolved: neutral
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
    'client_score',        COALESCE(v_agg_score, 60),
    'client_level',        COALESCE(v_client.level, 'New'),
    'has_history',         v_has_history,
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

-- Allow unauthenticated (anon) clients to call the public invoice RPC
GRANT EXECUTE ON FUNCTION public.get_public_invoice_data(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_invoice_data(TEXT) TO authenticated;


-- ============================================================
-- RPC: delete_user()
-- Lets a logged-in user delete their own account.
-- Cascades: auth.users → profiles → all owned data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;


-- ============================================================
-- RPC: delete_user_by_id(target_user_id)
-- CEO-only: deletes any user by id.
-- Cascades: auth.users → profiles → all owned data.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_ceo() THEN
    RAISE EXCEPTION 'Access denied: CEO only';
  END IF;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;


-- ============================================================
-- DONE
-- Tables: profiles, user_roles, subscriptions, access_requests,
--         banking_details, clients, client_notes, invoices,
--         commitments, communication_logs, reminder_settings
-- Triggers: auto-create profile/subscription/role on signup
--           auto-update updated_at on all mutable tables
-- RLS: all tables locked to owners, with 2 public inserts:
--      commitments (client portal) + access_requests (landing)
-- ============================================================
