-- Check current state of database for Antony
-- User ID: 289ca16e-8a89-4f1b-bc0f-5df41ebc1f80

-- 1. Check if was_correct column exists and show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'card_reviews'
ORDER BY ordinal_position;

-- 2. Count total cards and their status
SELECT 
  COUNT(*) as total_cards,
  SUM(CASE WHEN in_study_bank = true THEN 1 ELSE 0 END) as in_study_bank,
  SUM(CASE WHEN in_study_bank = true AND next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 3. Show cards by subject that are due
SELECT 
  subject_name,
  COUNT(*) as total_cards,
  SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
GROUP BY subject_name
ORDER BY subject_name;

-- 4. Check if any reviews exist now
SELECT 
  COUNT(*) as total_reviews,
  SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) as correct_reviews,
  SUM(CASE WHEN was_correct = false THEN 1 ELSE 0 END) as incorrect_reviews
FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'; 