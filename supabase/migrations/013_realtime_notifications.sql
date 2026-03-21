-- ============================================================
-- Enable Supabase Realtime on commitments and communication_logs
-- so the notification bell updates in real-time
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname   = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'commitments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.commitments;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname   = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'communication_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
  END IF;
END $$;
