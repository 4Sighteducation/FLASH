-- Update flashcards table to support AI-generated cards
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS card_type TEXT CHECK (card_type IN ('multiple_choice', 'short_answer', 'essay', 'acronym', 'manual')),
ADD COLUMN IF NOT EXISTS options JSONB,
ADD COLUMN IF NOT EXISTS correct_answer TEXT,
ADD COLUMN IF NOT EXISTS key_points JSONB,
ADD COLUMN IF NOT EXISTS detailed_answer TEXT;

-- Set default card type for existing cards
UPDATE flashcards 
SET card_type = 'manual' 
WHERE card_type IS NULL;

-- Add index for card type
CREATE INDEX IF NOT EXISTS idx_flashcards_card_type ON flashcards(card_type);

-- Update the view to include new columns
CREATE OR REPLACE VIEW flashcards_with_details AS
SELECT 
    f.*,
    eb.name as exam_board_name,
    eb.code as exam_board_code,
    qt.name as qualification_type_name,
    qt.code as qualification_type_code
FROM flashcards f
LEFT JOIN exam_boards eb ON f.exam_board_id = eb.id
LEFT JOIN qualification_types qt ON f.qualification_type_id = qt.id; 