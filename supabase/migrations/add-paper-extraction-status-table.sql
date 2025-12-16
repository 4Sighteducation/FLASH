-- Paper Extraction Status Table
-- Tracks the status of background paper extraction jobs

-- NOTE: This migration is written to be safe even if an earlier version of the
-- table already exists (e.g. created by create-exam-papers-system.sql).
-- The previous error you saw ("column user_id does not exist") happens when
-- the table exists but policies reference a column that wasn't in the older schema.

DO $$
BEGIN
  IF to_regclass('public.paper_extraction_status') IS NULL THEN
    CREATE TABLE paper_extraction_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      paper_id UUID NOT NULL,
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'pending',
        -- 'pending', 'extracting', 'completed', 'failed'
      progress_percentage INTEGER DEFAULT 0,
      current_step TEXT,
      error_message TEXT,
      questions_extracted INTEGER DEFAULT 0,
      mark_schemes_extracted INTEGER DEFAULT 0,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END
$$;

-- If an older schema created paper_extraction_status as a 1-row-per-paper summary,
-- it may have:
--   - paper_id as PRIMARY KEY
--   - paper_id REFERENCES exam_papers(id)
-- That conflicts with the newer "job/status" model (multiple users can trigger extraction,
-- and extraction can be initiated before exam_papers row exists).

-- Drop FK from paper_id -> exam_papers if it exists (prevents inserts for staging paper ids)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.paper_extraction_status'::regclass
      AND conname = 'paper_extraction_status_paper_id_fkey'
  ) THEN
    ALTER TABLE paper_extraction_status
      DROP CONSTRAINT paper_extraction_status_paper_id_fkey;
  END IF;
END
$$;

-- Ensure we are not using paper_id as the primary key anymore (job model needs composite uniqueness)
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT c.conname INTO pk_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.paper_extraction_status'::regclass
    AND c.contype = 'p'
  LIMIT 1;

  IF pk_name IS NOT NULL THEN
    -- If the existing PK is on paper_id (legacy schema), drop it.
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_attribute a
        ON a.attrelid = c.conrelid
       AND a.attnum = ANY (c.conkey)
      WHERE c.conrelid = 'public.paper_extraction_status'::regclass
        AND c.contype = 'p'
      GROUP BY c.conname
      HAVING array_agg(a.attname ORDER BY a.attname) = ARRAY['paper_id']
    ) THEN
      EXECUTE format('ALTER TABLE paper_extraction_status DROP CONSTRAINT %I', pk_name);
    END IF;
  END IF;
END
$$;

-- Ensure expected columns exist (covers older schema versions)
-- Some earlier versions may not have had a surrogate primary key. The app code expects `id`.
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE paper_extraction_status
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
UPDATE paper_extraction_status
  SET id = gen_random_uuid()
  WHERE id IS NULL;
ALTER TABLE paper_extraction_status
  ALTER COLUMN id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.paper_extraction_status'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE paper_extraction_status
      ADD CONSTRAINT paper_extraction_status_pkey PRIMARY KEY (id);
  END IF;
END
$$;

ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS paper_id UUID;
ALTER TABLE paper_extraction_status
  ALTER COLUMN paper_id SET NOT NULL;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS current_step TEXT;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS questions_extracted INTEGER DEFAULT 0;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS mark_schemes_extracted INTEGER DEFAULT 0;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE paper_extraction_status
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Ensure unique constraint exists (best-effort)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'paper_extraction_status_paper_id_user_id_key'
  ) THEN
    ALTER TABLE paper_extraction_status
      ADD CONSTRAINT paper_extraction_status_paper_id_user_id_key UNIQUE (paper_id, user_id);
  END IF;
END
$$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_paper_extraction_paper_id ON paper_extraction_status(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_extraction_user_id ON paper_extraction_status(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_extraction_status ON paper_extraction_status(status);

-- Enable Row Level Security
ALTER TABLE paper_extraction_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view all extraction statuses (to benefit from others' extractions)
DROP POLICY IF EXISTS "Anyone can view extraction status" ON paper_extraction_status;
CREATE POLICY "Anyone can view extraction status"
  ON paper_extraction_status
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own extraction requests" ON paper_extraction_status;
CREATE POLICY "Users can insert their own extraction requests"
  ON paper_extraction_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role can update extraction status" ON paper_extraction_status;
CREATE POLICY "Service role can update extraction status"
  ON paper_extraction_status
  FOR UPDATE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_extraction_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_extraction_status_timestamp ON paper_extraction_status;
CREATE TRIGGER update_extraction_status_timestamp
  BEFORE UPDATE ON paper_extraction_status
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_status_timestamp();

COMMENT ON TABLE paper_extraction_status IS 'Tracks background extraction job status for exam papers';
COMMENT ON COLUMN paper_extraction_status.status IS 'Current status: pending, extracting, completed, failed';
COMMENT ON COLUMN paper_extraction_status.progress_percentage IS 'Extraction progress from 0-100';
COMMENT ON COLUMN paper_extraction_status.current_step IS 'Human-readable current step';

