-- Add was_correct column to card_reviews table
-- This tracks whether the user answered the card correctly

ALTER TABLE public.card_reviews 
ADD COLUMN IF NOT EXISTS was_correct BOOLEAN;

-- Update existing reviews based on quality
-- Assuming quality >= 3 means correct, < 3 means incorrect
UPDATE public.card_reviews 
SET was_correct = CASE 
  WHEN quality >= 3 THEN true 
  ELSE false 
END
WHERE was_correct IS NULL;

-- Make the column NOT NULL for future inserts
ALTER TABLE public.card_reviews 
ALTER COLUMN was_correct SET NOT NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN public.card_reviews.was_correct IS 'Whether the user answered the flashcard correctly';

-- Update the check constraint to ensure quality aligns with was_correct
-- (This is optional but helps maintain data integrity)
ALTER TABLE public.card_reviews 
ADD CONSTRAINT check_quality_matches_correct 
CHECK (
  (was_correct = true AND quality >= 3) OR 
  (was_correct = false AND quality < 3)
); 