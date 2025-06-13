-- Reset all cards for Antony to test properly
-- User ID: 289ca16e-8a89-4f1b-bc0f-5df41ebc1f80

-- 1. First, check current state
SELECT 
  'Current State' as status,
  COUNT(*) as total_cards,
  SUM(CASE WHEN in_study_bank = true THEN 1 ELSE 0 END) as in_study_bank
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 2. Reset all cards to Box 1 with proper review dates
UPDATE flashcards
SET 
  box_number = 1,
  next_review_date = NOW(), -- All cards due immediately
  in_study_bank = true -- Put all cards in study bank
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 3. Delete all existing reviews to start fresh
DELETE FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 4. Verify the reset
SELECT 
  'After Reset' as status,
  COUNT(*) as total_cards,
  SUM(CASE WHEN in_study_bank = true THEN 1 ELSE 0 END) as in_study_bank,
  SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 5. Show cards by subject
SELECT 
  subject_name,
  COUNT(*) as cards_count,
  MIN(box_number) as min_box,
  MAX(box_number) as max_box
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
GROUP BY subject_name
ORDER BY subject_name; 