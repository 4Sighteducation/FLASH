-- Add difficulty column to flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS difficulty text 
CHECK (difficulty IN ('easy', 'medium', 'hard'))
DEFAULT 'medium';

-- Update any existing flashcards to have medium difficulty
UPDATE flashcards 
SET difficulty = 'medium' 
WHERE difficulty IS NULL; 