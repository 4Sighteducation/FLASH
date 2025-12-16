-- Paper Question XP Awards (one-time per user per question)
-- Used to award "25 points per correct mark" only on the first attempt of each question.

CREATE TABLE IF NOT EXISTS paper_question_xp_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL,

  marks_awarded INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,

  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_question_xp_awards_user_question ON paper_question_xp_awards(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_paper_question_xp_awards_user_paper ON paper_question_xp_awards(user_id, paper_id);

ALTER TABLE paper_question_xp_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own paper question xp awards"
  ON paper_question_xp_awards
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paper question xp awards"
  ON paper_question_xp_awards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot update paper question xp awards"
  ON paper_question_xp_awards
  FOR UPDATE
  USING (false);

CREATE POLICY "Users can delete their own paper question xp awards"
  ON paper_question_xp_awards
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE paper_question_xp_awards IS 'One-time XP awards per question (first attempt only), used to compute paper mark-based XP without double counting.';


