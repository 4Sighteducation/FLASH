-- Remaining schema improvements for the updated database

-- 1. Add missing unique constraints to prevent duplicates
ALTER TABLE public.user_topics 
  ADD CONSTRAINT user_topics_user_id_topic_id_key 
  UNIQUE (user_id, topic_id);

ALTER TABLE public.user_subjects 
  ADD CONSTRAINT user_subjects_user_id_subject_id_key 
  UNIQUE (user_id, subject_id);

ALTER TABLE public.user_achievements 
  ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
  UNIQUE (user_id, achievement_id);

-- 2. Add ON DELETE CASCADE to foreign keys for proper cleanup
-- Note: This requires dropping and recreating the constraints

-- For card_reviews
ALTER TABLE public.card_reviews 
  DROP CONSTRAINT card_reviews_flashcard_id_fkey,
  ADD CONSTRAINT card_reviews_flashcard_id_fkey 
  FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;

ALTER TABLE public.card_reviews 
  DROP CONSTRAINT card_reviews_user_id_fkey,
  ADD CONSTRAINT card_reviews_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.card_reviews 
  DROP CONSTRAINT card_reviews_study_session_id_fkey,
  ADD CONSTRAINT card_reviews_study_session_id_fkey 
  FOREIGN KEY (study_session_id) REFERENCES public.study_sessions(id) ON DELETE CASCADE;

-- For flashcards
ALTER TABLE public.flashcards 
  DROP CONSTRAINT flashcards_user_id_fkey,
  ADD CONSTRAINT flashcards_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For study_sessions
ALTER TABLE public.study_sessions 
  DROP CONSTRAINT study_sessions_user_id_fkey,
  ADD CONSTRAINT study_sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For user_achievements
ALTER TABLE public.user_achievements 
  DROP CONSTRAINT user_achievements_user_id_fkey,
  ADD CONSTRAINT user_achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For user_custom_topics
ALTER TABLE public.user_custom_topics 
  DROP CONSTRAINT user_custom_topics_user_id_fkey,
  ADD CONSTRAINT user_custom_topics_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For user_stats
ALTER TABLE public.user_stats 
  DROP CONSTRAINT user_stats_user_id_fkey,
  ADD CONSTRAINT user_stats_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For user_subjects
ALTER TABLE public.user_subjects 
  DROP CONSTRAINT user_subjects_user_id_fkey,
  ADD CONSTRAINT user_subjects_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For user_topics
ALTER TABLE public.user_topics 
  DROP CONSTRAINT user_topics_user_id_fkey,
  ADD CONSTRAINT user_topics_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- For users table
ALTER TABLE public.users 
  DROP CONSTRAINT users_id_fkey,
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add indexes for better query performance
CREATE INDEX idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX idx_flashcards_topic_id ON public.flashcards(topic_id);
CREATE INDEX idx_flashcards_next_review ON public.flashcards(user_id, next_review_date);
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_card_reviews_flashcard_id ON public.card_reviews(flashcard_id);
CREATE INDEX idx_card_reviews_user_id ON public.card_reviews(user_id);
CREATE INDEX idx_user_topics_user_id ON public.user_topics(user_id);
CREATE INDEX idx_user_topics_topic_id ON public.user_topics(topic_id);
CREATE INDEX idx_curriculum_topics_exam_board_subject_id ON public.curriculum_topics(exam_board_subject_id);
CREATE INDEX idx_curriculum_topics_parent_topic_id ON public.curriculum_topics(parent_topic_id);
CREATE INDEX idx_exam_board_subjects_exam_board_id ON public.exam_board_subjects(exam_board_id);
CREATE INDEX idx_user_custom_topics_user_id ON public.user_custom_topics(user_id);
CREATE INDEX idx_user_custom_topics_subject_id ON public.user_custom_topics(subject_id);

-- 4. Enable Row Level Security on all tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_board_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for public/shared data
CREATE POLICY "Anyone can view exam boards" ON public.exam_boards
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view qualification types" ON public.qualification_types
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view exam board subjects" ON public.exam_board_subjects
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view curriculum topics" ON public.curriculum_topics
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- 6. Create RLS policies for user-specific data
-- Users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- User topics
CREATE POLICY "Users can view own topics" ON public.user_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topics" ON public.user_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own topics" ON public.user_topics
  FOR DELETE USING (auth.uid() = user_id);

-- User custom topics
CREATE POLICY "Users can view own custom topics" ON public.user_custom_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom topics" ON public.user_custom_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom topics" ON public.user_custom_topics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom topics" ON public.user_custom_topics
  FOR DELETE USING (auth.uid() = user_id);

-- User subjects
CREATE POLICY "Users can view own subjects" ON public.user_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON public.user_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON public.user_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON public.user_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Flashcards
CREATE POLICY "Users can view own flashcards" ON public.flashcards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards" ON public.flashcards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON public.flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Study sessions
CREATE POLICY "Users can view own study sessions" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Card reviews
CREATE POLICY "Users can view own card reviews" ON public.card_reviews
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card reviews" ON public.card_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- User stats
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- 7. Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subjects_updated_at BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_custom_topics_updated_at BEFORE UPDATE ON public.user_custom_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_boards_updated_at BEFORE UPDATE ON public.exam_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_board_subjects_updated_at BEFORE UPDATE ON public.exam_board_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON public.curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 