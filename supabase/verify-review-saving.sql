-- Quick check to see if reviews are being saved
-- User ID: 289ca16e-8a89-4f1b-bc0f-5df41ebc1f80

-- 1. Count reviews in last hour
SELECT 
  COUNT(*) as reviews_last_hour,
  MAX(reviewed_at) as last_review_time
FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND reviewed_at > NOW() - INTERVAL '1 hour';

-- 2. Show last 5 reviews with details
SELECT 
  cr.reviewed_at,
  cr.was_correct,
  cr.quality,
  LEFT(f.question, 50) as question,
  f.subject_name,
  f.old_box_number,
  f.box_number as new_box_number
FROM card_reviews cr
JOIN (
  SELECT 
    id,
    question,
    subject_name,
    box_number,
    LAG(box_number) OVER (PARTITION BY id ORDER BY updated_at) as old_box_number
  FROM flashcards
) f ON cr.flashcard_id = f.id
WHERE cr.user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
ORDER BY cr.reviewed_at DESC
LIMIT 5; 