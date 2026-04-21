-- Add branch column to groups table so each group belongs to one branch
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'tunis';

-- Add branch column to transactions table so finances are per-branch
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'tunis';

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
