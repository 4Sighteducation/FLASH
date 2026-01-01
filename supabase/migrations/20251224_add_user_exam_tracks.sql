-- Add primary/secondary exam tracks to support blended study paths (e.g., A-Level + GCSE Astronomy)
-- Safe, additive migration.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS primary_exam_type TEXT,
ADD COLUMN IF NOT EXISTS secondary_exam_type TEXT;

-- Backfill primary from legacy exam_type if present
UPDATE public.users
SET primary_exam_type = exam_type
WHERE primary_exam_type IS NULL
  AND exam_type IS NOT NULL;





