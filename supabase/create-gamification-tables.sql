-- Gamification System Tables for FLASH App

-- Drop existing objects if they exist (for clean re-run)
DROP VIEW IF EXISTS leaderboard CASCADE;
DROP FUNCTION IF EXISTS update_user_stats_after_session CASCADE;

-- User achievements/badges table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL, -- 'perfect_score', 'streak_3', 'streak_7', 'cards_created_10', etc.
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon_name TEXT, -- Ionicon name
  icon_color TEXT, -- Hex color
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  points_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_type)
);

-- User statistics table for tracking progress
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  total_cards_reviewed INTEGER DEFAULT 0,
  total_correct_answers INTEGER DEFAULT 0,
  total_cards_created INTEGER DEFAULT 0,
  total_cards_mastered INTEGER DEFAULT 0, -- Cards that reached box 5
  total_study_sessions INTEGER DEFAULT 0,
  perfect_sessions INTEGER DEFAULT 0, -- Sessions with 100% correct
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study session history for detailed tracking
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  topic_name TEXT,
  cards_reviewed INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  incorrect_answers INTEGER NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL, -- Percentage
  points_earned INTEGER DEFAULT 0,
  session_duration INTEGER, -- In seconds
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Points configuration table (for admins to adjust point values)
CREATE TABLE IF NOT EXISTS points_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT UNIQUE NOT NULL, -- 'correct_answer', 'perfect_session', 'card_created', etc.
  points_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Insert default point values
INSERT INTO points_config (action_type, points_value, description) VALUES
  ('correct_answer', 10, 'Points for each correct answer'),
  ('incorrect_answer', 2, 'Consolation points for attempting'),
  ('perfect_session', 50, 'Bonus for 100% correct in a session'),
  ('great_session', 25, 'Bonus for 70%+ correct in a session'),
  ('card_created', 5, 'Points for creating a flashcard'),
  ('card_mastered', 20, 'Points when a card reaches box 5'),
  ('daily_streak', 15, 'Points for maintaining daily streak'),
  ('weekly_streak', 100, 'Bonus for 7-day streak'),
  ('monthly_streak', 500, 'Bonus for 30-day streak')
ON CONFLICT (action_type) DO NOTHING;

-- Create leaderboard view only after tables exist
CREATE VIEW leaderboard AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(us.total_points, 0) as total_points,
  COALESCE(us.current_streak, 0) as current_streak,
  COALESCE(us.total_cards_reviewed, 0) as total_cards_reviewed,
  COALESCE(us.total_cards_mastered, 0) as total_cards_mastered,
  CASE 
    WHEN us.total_cards_reviewed > 0 
    THEN ROUND((us.total_correct_answers::DECIMAL / us.total_cards_reviewed) * 100, 2)
    ELSE 0
  END as overall_success_rate,
  COUNT(DISTINCT ua.id) as total_achievements
FROM auth.users u
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.email, us.total_points, us.current_streak, us.total_cards_reviewed, 
         us.total_cards_mastered, us.total_correct_answers
ORDER BY total_points DESC;

-- Function to update user stats after a study session
CREATE OR REPLACE FUNCTION update_user_stats_after_session(
  p_user_id UUID,
  p_cards_reviewed INTEGER,
  p_correct_answers INTEGER,
  p_incorrect_answers INTEGER,
  p_points_earned INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_last_study_date DATE;
  v_current_streak INTEGER;
BEGIN
  -- Get current user stats
  SELECT last_study_date, current_streak 
  INTO v_last_study_date, v_current_streak
  FROM user_stats 
  WHERE user_id = p_user_id;

  -- Calculate streak
  IF v_last_study_date IS NULL OR v_last_study_date = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
  ELSIF v_last_study_date < CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := 1;
  END IF;

  -- Update or insert user stats
  INSERT INTO user_stats (
    user_id, 
    total_points, 
    current_streak, 
    longest_streak,
    last_study_date,
    total_cards_reviewed,
    total_correct_answers,
    total_study_sessions,
    perfect_sessions
  ) VALUES (
    p_user_id,
    p_points_earned,
    v_current_streak,
    v_current_streak,
    CURRENT_DATE,
    p_cards_reviewed,
    p_correct_answers,
    1,
    CASE WHEN p_incorrect_answers = 0 AND p_cards_reviewed > 0 THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_stats.total_points + p_points_earned,
    current_streak = v_current_streak,
    longest_streak = GREATEST(user_stats.longest_streak, v_current_streak),
    last_study_date = CURRENT_DATE,
    total_cards_reviewed = user_stats.total_cards_reviewed + p_cards_reviewed,
    total_correct_answers = user_stats.total_correct_answers + p_correct_answers,
    total_study_sessions = user_stats.total_study_sessions + 1,
    perfect_sessions = user_stats.perfect_sessions + 
      CASE WHEN p_incorrect_answers = 0 AND p_cards_reviewed > 0 THEN 1 ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can view their own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can view their own sessions" ON study_sessions;

-- RLS Policies
CREATE POLICY "Users can view their own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON study_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_achievements TO authenticated;
GRANT ALL ON user_stats TO authenticated;
GRANT ALL ON study_sessions TO authenticated;
GRANT SELECT ON points_config TO authenticated;
GRANT SELECT ON leaderboard TO authenticated;

-- Verification queries (run these to check if everything was created)
-- SELECT COUNT(*) FROM points_config; -- Should return 9
-- SELECT * FROM leaderboard LIMIT 5; -- Should work without errors
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_achievements', 'user_stats', 'study_sessions', 'points_config'); 