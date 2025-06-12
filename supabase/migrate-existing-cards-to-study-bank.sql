-- Migration to connect existing cards to the new study bank system

-- 1. Update all existing flashcards to be in the study bank by default
-- This ensures users don't lose their progress
UPDATE public.flashcards
SET 
  in_study_bank = TRUE,
  added_to_study_bank_at = COALESCE(created_at, NOW())
WHERE in_study_bank IS NULL;

-- 2. Create topic study preferences for all topics that have flashcards
INSERT INTO public.topic_study_preferences (user_id, topic_id, in_study_bank, created_at, updated_at)
SELECT DISTINCT 
  f.user_id,
  f.topic_id,
  TRUE as in_study_bank,
  NOW() as created_at,
  NOW() as updated_at
FROM public.flashcards f
WHERE f.topic_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM public.topic_study_preferences tsp 
    WHERE tsp.user_id = f.user_id 
      AND tsp.topic_id = f.topic_id
  );

-- 3. Populate daily study cards for today based on existing due cards
INSERT INTO public.daily_study_cards (user_id, flashcard_id, study_date, completed, created_at)
SELECT 
  f.user_id,
  f.id,
  CURRENT_DATE,
  FALSE,
  NOW()
FROM public.flashcards f
WHERE f.next_review_date::date <= CURRENT_DATE
  AND f.in_study_bank = TRUE
  AND NOT EXISTS (
    SELECT 1 
    FROM public.daily_study_cards dsc 
    WHERE dsc.user_id = f.user_id 
      AND dsc.flashcard_id = f.id 
      AND dsc.study_date = CURRENT_DATE
  );

-- 4. Add a function to ensure consistency between flashcards and topic preferences
CREATE OR REPLACE FUNCTION ensure_topic_preference_exists()
RETURNS TRIGGER AS $$
BEGIN
  -- When a flashcard is inserted with in_study_bank = true, ensure topic preference exists
  IF NEW.in_study_bank = TRUE AND NEW.topic_id IS NOT NULL THEN
    INSERT INTO public.topic_study_preferences (user_id, topic_id, in_study_bank)
    VALUES (NEW.user_id, NEW.topic_id, TRUE)
    ON CONFLICT (user_id, topic_id) 
    DO UPDATE SET 
      in_study_bank = TRUE,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new flashcards
CREATE TRIGGER ensure_topic_preference_on_flashcard_insert
AFTER INSERT ON public.flashcards
FOR EACH ROW
EXECUTE FUNCTION ensure_topic_preference_exists();

-- 5. Update the populate_daily_study_cards function to be more robust
CREATE OR REPLACE FUNCTION populate_daily_study_cards(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert cards that are due for review today and in study bank
  INSERT INTO public.daily_study_cards (user_id, flashcard_id, study_date)
  SELECT 
    p_user_id,
    id,
    CURRENT_DATE
  FROM public.flashcards
  WHERE user_id = p_user_id
    AND in_study_bank = TRUE
    AND next_review_date::date <= CURRENT_DATE
    AND box_number < 5  -- Don't include retired cards in daily review
  ON CONFLICT (user_id, flashcard_id, study_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql; 