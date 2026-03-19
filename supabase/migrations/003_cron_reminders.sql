-- ============================================================
-- Migration 003: Daily reminder automation via pg_cron + pg_net
--
-- IMPORTANT: Before running this migration, replace the two
-- placeholder values below with your actual project values:
--
--   YOUR_PROJECT_REF  → Found in Supabase Dashboard > Settings > General
--   YOUR_SERVICE_ROLE_KEY → Found in Supabase Dashboard > Settings > API
--
-- You can run this in Supabase SQL Editor after deployment.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule process-reminders to run every day at 08:00 UTC
-- (10:00 SAST = UTC+2)
SELECT cron.schedule(
  'process-daily-reminders',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://icdyzbrnmvvlhpezgcky.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To verify the job is scheduled:
-- SELECT * FROM cron.job;

-- To unschedule if needed:
-- SELECT cron.unschedule('process-daily-reminders');
