-- ============================================================
-- Payments table: tracks individual payments against invoices
-- Supports deposit, balance, full, partial, and overpayment types
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id       UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('deposit','balance','full','partial')),
  expected_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes            TEXT,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Add amount_paid to invoices for quick balance lookup
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12,2) DEFAULT 0;

-- Allow 'partially_paid' status on invoices
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft','sent','paid','overdue','cancelled','project_completed','partially_paid'));

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payments"
  ON public.payments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
