-- ============================================================
-- Migration 008: Invoice link view tracking
-- Adds view_count + last_viewed_at to invoices table
-- Creates invoice_views table for per-view records
-- Creates track_invoice_view RPC (public, anon-accessible)
-- Enables realtime on invoices for live view count updates
-- ============================================================

-- Add tracking columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS view_count     INT         DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ DEFAULT NULL;

-- ============================================================
-- TABLE: invoice_views
-- One row per unique page-load of the public invoice link
-- No auth required — clients open links without logging in
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_views (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id     UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  user_agent     TEXT,
  viewed_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_views_invoice_id ON public.invoice_views(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_views_viewed_at  ON public.invoice_views(viewed_at);

ALTER TABLE public.invoice_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_views: public can insert" ON public.invoice_views;
DROP POLICY IF EXISTS "invoice_views: owner can read"    ON public.invoice_views;

-- Anyone (anon) can insert a view when opening an invoice link
CREATE POLICY "invoice_views: public can insert"
  ON public.invoice_views FOR INSERT
  WITH CHECK (TRUE);

-- Only the invoice owner can read their view records
CREATE POLICY "invoice_views: owner can read"
  ON public.invoice_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
       WHERE i.id = invoice_id
         AND i.user_id = auth.uid()
    )
  );


-- ============================================================
-- RPC: track_invoice_view(p_invoice_number, p_user_agent)
-- Public (anon) — called when client opens the invoice link.
-- Inserts a view record, increments view_count, sets last_viewed_at.
-- ============================================================
CREATE OR REPLACE FUNCTION public.track_invoice_view(
  p_invoice_number TEXT,
  p_user_agent     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
BEGIN
  SELECT id INTO v_invoice_id
    FROM public.invoices
   WHERE number = p_invoice_number
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
  END IF;

  -- Deduplicate requests arriving within 3 seconds of each other.
  -- This absorbs React StrictMode's double-invocation (fires within milliseconds)
  -- while still counting every genuine page load as +1.
  IF EXISTS (
    SELECT 1 FROM public.invoice_views
     WHERE invoice_id = v_invoice_id
       AND viewed_at  > NOW() - INTERVAL '3 seconds'
  ) THEN
    RETURN jsonb_build_object('success', true, 'deduplicated', true);
  END IF;

  INSERT INTO public.invoice_views (invoice_id, invoice_number, user_agent)
    VALUES (v_invoice_id, p_invoice_number, p_user_agent);

  UPDATE public.invoices
     SET view_count     = COALESCE(view_count, 0) + 1,
         last_viewed_at = NOW()
   WHERE id = v_invoice_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_invoice_view(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.track_invoice_view(TEXT, TEXT) TO authenticated;


-- ============================================================
-- Enable Supabase Realtime on invoices table so the dashboard
-- and invoices page receive live view_count updates
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname   = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename  = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
END $$;
