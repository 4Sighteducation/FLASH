-- Final schema improvements based on current state

-- 1. Add missing unique constraints (these are still missing)
ALTER TABLE public.user_topics 
  ADD CONSTRAINT user_topics_user_id_topic_id_key 
  UNIQUE (user_id, topic_id);

ALTER TABLE public.user_subjects 
  ADD CONSTRAINT user_subjects_user_id_subject_id_key 
  UNIQUE (user_id, subject_id);

ALTER TABLE public.user_achievements 
  ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
  UNIQUE (user_id, achievement_id);

-- 2. Update foreign keys to add ON DELETE CASCADE
-- Your current foreign keys don't have CASCADE, which means deleting a user won't clean up their data

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

ALTER TABLE public.user_achievements 
  DROP CONSTRAINT user_achievements_achievement_id_fkey,
  ADD CONSTRAINT user_achievements_achievement_id_fkey 
  FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;

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

-- 3. Add missing indexes for performance
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
CREATE INDEX idx_user_subjects_user_id ON public.user_subjects(user_id);
CREATE INDEX idx_user_subjects_subject_id ON public.user_subjects(subject_id);

-- 4. Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Add update triggers for tables with updated_at columns
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