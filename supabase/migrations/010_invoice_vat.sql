-- Add VAT fields to invoices so each invoice records its own VAT snapshot
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_enabled    BOOLEAN DEFAULT FALSE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vat_amount     NUMERIC(12,2) DEFAULT 0;
