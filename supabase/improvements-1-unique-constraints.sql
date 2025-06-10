-- Step 1: Unique Constraints (with existence checks)
-- These prevent duplicate entries

-- Check and add unique constraint for user_topics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_topics_user_id_topic_id_key'
  ) THEN
    ALTER TABLE public.user_topics 
      ADD CONSTRAINT user_topics_user_id_topic_id_key 
      UNIQUE (user_id, topic_id);
    RAISE NOTICE 'Added unique constraint to user_topics';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on user_topics';
  END IF;
END $$;

-- Check and add unique constraint for user_subjects
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subjects_user_id_subject_id_key'
  ) THEN
    ALTER TABLE public.user_subjects 
      ADD CONSTRAINT user_subjects_user_id_subject_id_key 
      UNIQUE (user_id, subject_id);
    RAISE NOTICE 'Added unique constraint to user_subjects';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on user_subjects';
  END IF;
END $$;

-- Check and add unique constraint for user_achievements
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_achievements_user_id_achievement_id_key'
  ) THEN
    ALTER TABLE public.user_achievements 
      ADD CONSTRAINT user_achievements_user_id_achievement_id_key 
      UNIQUE (user_id, achievement_id);
    RAISE NOTICE 'Added unique constraint to user_achievements';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on user_achievements';
  END IF;
END $$; 