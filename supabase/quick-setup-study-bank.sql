-- Quick setup to connect existing cards to study bank system
-- Run this in Supabase SQL editor

-- 1. Add study bank columns if they don't exist
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS in_study_bank BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS added_to_study_bank_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Update all existing cards to be in study bank
UPDATE public.flashcards
SET 
  in_study_bank = TRUE,
  added_to_study_bank_at = COALESCE(created_at, NOW())
WHERE in_study_bank IS NULL;

-- 3. Add topic_name column if missing (for backwards compatibility)
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS topic_name TEXT;

-- 4. Copy topic to topic_name for existing cards
UPDATE public.flashcards
SET topic_name = topic
WHERE topic_name IS NULL AND topic IS NOT NULL;

-- 5. Ensure all cards have proper review dates
UPDATE public.flashcards
SET next_review_date = NOW()
WHERE next_review_date IS NULL; 