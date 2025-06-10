-- Step 2: Update Foreign Keys to Add CASCADE Deletes
-- This ensures when a user is deleted, all their data is cleaned up automatically

-- Update all foreign keys to include ON DELETE CASCADE
DO $$ 
BEGIN
  -- For card_reviews
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
    
  -- For flashcards
  ALTER TABLE public.flashcards 
    DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
  ALTER TABLE public.flashcards
    ADD CONSTRAINT flashcards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For study_sessions
  ALTER TABLE public.study_sessions 
    DROP CONSTRAINT IF EXISTS study_sessions_user_id_fkey;
  ALTER TABLE public.study_sessions
    ADD CONSTRAINT study_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For user_achievements
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
    
  -- For user_custom_topics
  ALTER TABLE public.user_custom_topics 
    DROP CONSTRAINT IF EXISTS user_custom_topics_user_id_fkey;
  ALTER TABLE public.user_custom_topics
    ADD CONSTRAINT user_custom_topics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For user_stats
  ALTER TABLE public.user_stats 
    DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;
  ALTER TABLE public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For user_subjects
  ALTER TABLE public.user_subjects 
    DROP CONSTRAINT IF EXISTS user_subjects_user_id_fkey;
  ALTER TABLE public.user_subjects
    ADD CONSTRAINT user_subjects_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For user_topics
  ALTER TABLE public.user_topics 
    DROP CONSTRAINT IF EXISTS user_topics_user_id_fkey;
  ALTER TABLE public.user_topics
    ADD CONSTRAINT user_topics_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
  -- For users table
  ALTER TABLE public.users 
    DROP CONSTRAINT IF EXISTS users_id_fkey;
  ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    
  RAISE NOTICE 'Updated all foreign keys to include CASCADE deletes';
END $$; 