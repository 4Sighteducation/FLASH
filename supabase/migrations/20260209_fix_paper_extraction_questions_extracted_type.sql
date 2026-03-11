-- Fix legacy schema mismatch: questions_extracted was boolean in older papers schema,
-- but the extraction job model writes integer counts (e.g. 12).
-- This migration converts the column to integer safely and idempotently.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'paper_extraction_status'
      AND column_name = 'questions_extracted'
      AND data_type = 'boolean'
  ) THEN
    -- Drop default before type change (it may be "false")
    ALTER TABLE public.paper_extraction_status
      ALTER COLUMN questions_extracted DROP DEFAULT;

    -- Convert boolean -> integer (true => 1, false/null => 0)
    ALTER TABLE public.paper_extraction_status
      ALTER COLUMN questions_extracted TYPE integer
      USING (CASE WHEN questions_extracted IS TRUE THEN 1 ELSE 0 END);

    -- Align with job/status schema expectations
    ALTER TABLE public.paper_extraction_status
      ALTER COLUMN questions_extracted SET DEFAULT 0;
  END IF;
END
$$;

