-- Paper XP Awards (one-time per user per paper)
-- Used to prevent double-counting exam-paper XP/bonuses while allowing cached papers to be reused.

CREATE TABLE IF NOT EXISTS paper_xp_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL,

  -- Breakdown
  marks_points INTEGER NOT NULL DEFAULT 0,
  completion_points INTEGER NOT NULL DEFAULT 0,
  bonus_points INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,

  total_score INTEGER,
  max_score INTEGER,
  percentage NUMERIC,

  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, paper_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_xp_awards_user_paper ON paper_xp_awards(user_id, paper_id);

-- Enable Row Level Security
ALTER TABLE paper_xp_awards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own paper xp awards"
  ON paper_xp_awards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paper xp awards"
  ON paper_xp_awards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Do not allow updates (awards are immutable once created)
CREATE POLICY "Users cannot update paper xp awards"
  ON paper_xp_awards
  FOR UPDATE
  USING (false);

CREATE POLICY "Users can delete their own paper xp awards"
  ON paper_xp_awards
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE paper_xp_awards IS 'One-time XP awards for completing an exam paper; prevents double counting per user+paper.';



