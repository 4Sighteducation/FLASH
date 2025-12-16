-- Paper Progress Table for Pause/Resume Functionality
-- Stores user progress when they pause an exam paper

CREATE TABLE IF NOT EXISTS paper_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  current_answer TEXT,
  timer_seconds INTEGER DEFAULT 0,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one progress record per user per paper
  UNIQUE(user_id, paper_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paper_progress_user_paper ON paper_progress(user_id, paper_id);

-- Enable Row Level Security
ALTER TABLE paper_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own paper progress"
  ON paper_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paper progress"
  ON paper_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paper progress"
  ON paper_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own paper progress"
  ON paper_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_paper_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_paper_progress_timestamp
  BEFORE UPDATE ON paper_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_paper_progress_timestamp();

COMMENT ON TABLE paper_progress IS 'Stores user progress when they pause an exam paper for resume later';
COMMENT ON COLUMN paper_progress.current_question_index IS 'Zero-based index of the current question';
COMMENT ON COLUMN paper_progress.current_answer IS 'Answer in progress when paper was paused';
COMMENT ON COLUMN paper_progress.timer_seconds IS 'Timer value when paper was paused';

