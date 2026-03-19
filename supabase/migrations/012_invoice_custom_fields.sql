-- Add two optional custom text fields to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS custom_field_1 TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS custom_field_2 TEXT;
