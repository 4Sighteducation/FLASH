-- Schema fixes with existence checks

-- 1. Add missing foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'flashcards_topic_id_fkey'
  ) THEN
    ALTER TABLE public.flashcards 
      ADD CONSTRAINT flashcards_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.curriculum_topics(id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_topics_topic_id_fkey'
  ) THEN
    ALTER TABLE public.user_topics 
      ADD CONSTRAINT user_topics_topic_id_fkey 
      FOREIGN KEY (topic_id) REFERENCES public.curriculum_topics(id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subjects_subject_id_fkey'
  ) THEN
    ALTER TABLE public.user_subjects 
      ADD CONSTRAINT user_subjects_subject_id_fkey 
      FOREIGN KEY (subject_id) REFERENCES public.exam_board_subjects(id);
  END IF;
END $$;

-- 2. Add unique constraints (only if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_topics_user_id_topic_id_key'
  ) THEN
    ALTER TABLE public.user_topics 
      ADD CONSTRAINT user_topics_user_id_topic_id_key 
      UNIQUE (user_id, topic_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subjects_user_id_subject_id_key'
  ) THEN
    ALTER TABLE public.user_subjects 
      ADD CONSTRAINT user_subjects_user_id_subject_id_key 
      UNIQUE (user_id, subject_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_id_achievement_id_key'
  ) THEN
    ALTER TABLE public.user_achievements 
      ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
      UNIQUE (user_id, achievement_id);
  END IF;
END $$;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_exam_board_subject_id 
  ON public.curriculum_topics(exam_board_subject_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_parent_topic_id 
  ON public.curriculum_topics(parent_topic_id);

CREATE INDEX IF NOT EXISTS idx_exam_board_subjects_exam_board_id 
  ON public.exam_board_subjects(exam_board_id);

CREATE INDEX IF NOT EXISTS idx_user_custom_topics_subject_id 
  ON public.user_custom_topics(subject_id);

CREATE INDEX IF NOT EXISTS idx_user_custom_topics_original_topic_id 
  ON public.user_custom_topics(original_topic_id);

-- 4. Update foreign keys to add ON DELETE CASCADE
-- First drop existing constraints, then recreate with CASCADE
DO $$ 
BEGIN
  -- Drop and recreate each constraint with CASCADE
  ALTER TABLE public.card_reviews 
    DROP CONSTRAINT IF EXISTS card_reviews_flashcard_id_fkey;
  ALTER TABLE public.card_reviews
    ADD CONSTRAINT card_reviews_flashcard_id_fkey 
    FOREIGN KEY (flashcard_id) REFERENCES public.flashcards(id) ON DELETE CASCADE;
    
  ALTER TABLE public.card_reviews 
    DROP CONSTRAINT IF EXISTS card_reviews_user_id_fkey;
  ALTER TABLE public.card_reviews
    ADD CONSTRAINT card_reviews_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.card_reviews 
    DROP CONSTRAINT IF EXISTS card_reviews_study_session_id_fkey;
  ALTER TABLE public.card_reviews
    ADD CONSTRAINT card_reviews_study_session_id_fkey 
    FOREIGN KEY (study_session_id) REFERENCES public.study_sessions(id) ON DELETE CASCADE;
    
  ALTER TABLE public.flashcards 
    DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
  ALTER TABLE public.flashcards
    ADD CONSTRAINT flashcards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.study_sessions 
    DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_achievements 
    DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
  ALTER TABLE public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_achievements 
    DROP CONSTRAINT IF EXISTS user_achievements_achievement_id_fkey;
  ALTER TABLE public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey 
    FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_custom_topics 
    DROP CONSTRAINT IF EXISTS user_custom_topics_user_id_fkey;
  ALTER TABLE public.user_custom_topics
    ADD CONSTRAINT user_custom_topics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_stats 
    DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
  ALTER TABLE public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_subjects 
    DROP CONSTRAINT IF EXISTS user_subjects_user_id_fkey;
  ALTER TABLE public.user_subjects
    ADD CONSTRAINT user_subjects_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.user_topics 
    DROP CONSTRAINT IF EXISTS user_topics_user_id_fkey;
  ALTER TABLE public.user_topics
    ADD CONSTRAINT user_topics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  ALTER TABLE public.users 
    DROP CONSTRAINT IF EXISTS users_id_fkey;
  ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- 5. Add check constraints for data integrity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'curriculum_topics_topic_level_check'
  ) THEN
    ALTER TABLE public.curriculum_topics 
      ADD CONSTRAINT curriculum_topics_topic_level_check 
      CHECK (topic_level >= 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'curriculum_topics_teaching_hours_check'
  ) THEN
    ALTER TABLE public.curriculum_topics 
      ADD CONSTRAINT curriculum_topics_teaching_hours_check 
      CHECK (teaching_hours >= 0);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'curriculum_topics_assessment_weight_check'
  ) THEN
    ALTER TABLE public.curriculum_topics 
      ADD CONSTRAINT curriculum_topics_assessment_weight_check 
      CHECK (assessment_weight >= 0 AND assessment_weight <= 100);
  END IF;
END $$;

-- 6. Add missing RLS policies for new tables
ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_board_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Anyone can view exam boards" ON public.exam_boards;
CREATE POLICY "Anyone can view exam boards" ON public.exam_boards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view qualification types" ON public.qualification_types;
CREATE POLICY "Anyone can view qualification types" ON public.qualification_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view exam board subjects" ON public.exam_board_subjects;
CREATE POLICY "Anyone can view exam board subjects" ON public.exam_board_subjects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view curriculum topics" ON public.curriculum_topics;
CREATE POLICY "Anyone can view curriculum topics" ON public.curriculum_topics
  FOR SELECT USING (true);

-- 7. Add triggers for updated_at columns (drop first if exists)
DROP TRIGGER IF EXISTS update_exam_boards_updated_at ON public.exam_boards;
CREATE TRIGGER update_exam_boards_updated_at BEFORE UPDATE ON public.exam_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_board_subjects_updated_at ON public.exam_board_subjects;
CREATE TRIGGER update_exam_board_subjects_updated_at BEFORE UPDATE ON public.exam_board_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_curriculum_topics_updated_at ON public.curriculum_topics;
CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON public.curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 