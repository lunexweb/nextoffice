-- ============================================================
-- Migration 005: Auto-mark invoices as overdue
--
-- Creates a function + daily cron job that flips invoices
-- from 'sent' → 'overdue' when due_date < CURRENT_DATE.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to update overdue invoices
CREATE OR REPLACE FUNCTION public.mark_overdue_invoices()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.invoices
  SET status = 'overdue',
      updated_at = NOW()
  WHERE status = 'sent'
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Schedule to run every day at 00:05 UTC (02:05 SAST)
SELECT cron.unschedule('mark-overdue-invoices')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mark-overdue-invoices');

SELECT cron.schedule(
  'mark-overdue-invoices',
  '5 0 * * *',
  $$SELECT public.mark_overdue_invoices();$$
);

-- Verify
-- SELECT * FROM cron.job WHERE jobname = 'mark-overdue-invoices';
