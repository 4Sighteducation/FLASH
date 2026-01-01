-- ============================================
-- ADD is_overview COLUMN TO flashcards TABLE
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add the is_overview column to flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS is_overview BOOLEAN DEFAULT FALSE;

-- Create an index for faster queries on overview cards
CREATE INDEX IF NOT EXISTS idx_flashcards_is_overview 
ON flashcards(is_overview) 
WHERE is_overview = TRUE;

-- Update description
COMMENT ON COLUMN flashcards.is_overview IS 'Indicates if this card is an overview/comparison card for a parent topic (L1/L2) vs a specific detail card (L4/L5)';

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'flashcards' 
  AND column_name = 'is_overview';




