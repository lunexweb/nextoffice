-- ============================================================
-- Migration 002: Resend email tracking columns
-- ============================================================

ALTER TABLE public.communication_logs
  ADD COLUMN IF NOT EXISTS email_id       TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT;

CREATE INDEX IF NOT EXISTS idx_communication_logs_email_id
  ON public.communication_logs(email_id);
