-- Paper Extraction Status Table
-- Tracks the status of background paper extraction jobs

CREATE TABLE IF NOT EXISTS paper_extraction_status (
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Allow multiple users to trigger same paper extraction
  UNIQUE(paper_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_paper_extraction_paper_id ON paper_extraction_status(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_extraction_user_id ON paper_extraction_status(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_extraction_status ON paper_extraction_status(status);

-- Enable Row Level Security
ALTER TABLE paper_extraction_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view all extraction statuses (to benefit from others' extractions)
CREATE POLICY "Anyone can view extraction status"
  ON paper_extraction_status
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own extraction requests"
  ON paper_extraction_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

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
CREATE TRIGGER update_extraction_status_timestamp
  BEFORE UPDATE ON paper_extraction_status
  FOR EACH ROW
  EXECUTE FUNCTION update_extraction_status_timestamp();

COMMENT ON TABLE paper_extraction_status IS 'Tracks background extraction job status for exam papers';
COMMENT ON COLUMN paper_extraction_status.status IS 'Current status: pending, extracting, completed, failed';
COMMENT ON COLUMN paper_extraction_status.progress_percentage IS 'Extraction progress from 0-100';
COMMENT ON COLUMN paper_extraction_status.current_step IS 'Human-readable current step';

