-- Migration 016: Add missing commitment types to CHECK constraint
-- The 'pay_now' and 'pay_on_due_date' types were added to the frontend
-- but never added to the database CHECK constraint, causing 400 errors.

-- Drop the old check constraint on the type column
ALTER TABLE public.commitments DROP CONSTRAINT IF EXISTS commitments_type_check;

-- Re-create with all valid types
ALTER TABLE public.commitments ADD CONSTRAINT commitments_type_check
  CHECK (type IN ('deposit', 'payment_plan', 'extension', 'already_paid', 'project_completion', 'pay_now', 'pay_on_due_date'));
