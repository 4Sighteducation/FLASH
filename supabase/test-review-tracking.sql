-- Test Review Tracking for Antony
-- User ID: 289ca16e-8a89-4f1b-bc0f-5df41ebc1f80
-- Run this AFTER reviewing at least one card in the app

-- 1. Show the last 5 reviews
SELECT 
  cr.id,
  cr.reviewed_at,
  cr.was_correct,
  cr.quality,
  f.question,
  f.subject_name,
  f.box_number
FROM card_reviews cr
JOIN flashcards f ON cr.flashcard_id = f.id
WHERE cr.user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
ORDER BY cr.reviewed_at DESC
LIMIT 5;

-- 2. Count total reviews
SELECT 
  COUNT(*) as total_reviews,
  SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) as correct_reviews,
  SUM(CASE WHEN was_correct = false THEN 1 ELSE 0 END) as incorrect_reviews,
  ROUND(100.0 * SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as percent_correct
FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80';

-- 3. Show reviews by date
SELECT 
  DATE(reviewed_at) as review_date,
  COUNT(*) as reviews_that_day,
  SUM(CASE WHEN was_correct = true THEN 1 ELSE 0 END) as correct,
  SUM(CASE WHEN was_correct = false THEN 1 ELSE 0 END) as incorrect
FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
GROUP BY DATE(reviewed_at)
ORDER BY review_date DESC; 