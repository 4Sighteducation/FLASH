-- Step 4: Add Update Triggers for updated_at Columns
-- These automatically update the updated_at timestamp when a row is modified

-- First create or replace the function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Then create triggers (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcards_updated_at ON public.flashcards;
CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subjects_updated_at ON public.user_subjects;
CREATE TRIGGER update_user_subjects_updated_at BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_custom_topics_updated_at ON public.user_custom_topics;
CREATE TRIGGER update_user_custom_topics_updated_at BEFORE UPDATE ON public.user_custom_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_boards_updated_at ON public.exam_boards;
CREATE TRIGGER update_exam_boards_updated_at BEFORE UPDATE ON public.exam_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exam_board_subjects_updated_at ON public.exam_board_subjects;
CREATE TRIGGER update_exam_board_subjects_updated_at BEFORE UPDATE ON public.exam_board_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_curriculum_topics_updated_at ON public.curriculum_topics;
CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON public.curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify triggers were created
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    AND trigger_name LIKE 'update_%_updated_at';
    
    RAISE NOTICE 'Created % update triggers', trigger_count;
END $$; 