-- Debug Review Dates for Antony D (Version without was_correct column)
-- User ID: 289ca16e-8a89-4f1b-bc0f-5df41ebc1f80

-- 1. Show all cards with their review dates and box numbers
SELECT 
  id,
  LEFT(question, 50) as question_preview,
  subject_name,
  box_number,
  in_study_bank,
  created_at,
  next_review_date,
  CASE 
    WHEN next_review_date <= NOW() THEN 'DUE NOW'
    ELSE 'Not due yet'
  END as status,
  CASE 
    WHEN next_review_date > NOW() THEN 
      ROUND(EXTRACT(EPOCH FROM (next_review_date - NOW())) / 3600) || ' hours'
    ELSE 
      'Overdue by ' || ROUND(EXTRACT(EPOCH FROM (NOW() - next_review_date)) / 3600) || ' hours'
  END as time_until_due
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
ORDER BY next_review_date;

-- 2. Count cards by box and due status
SELECT 
  box_number,
  COUNT(*) as total_cards,
  SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now,
  SUM(CASE WHEN next_review_date > NOW() THEN 1 ELSE 0 END) as not_due_yet
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
GROUP BY box_number
ORDER BY box_number;

-- 3. Show review history to understand box progression (last 20 reviews)
SELECT 
  f.id,
  LEFT(f.question, 30) as question,
  f.box_number,
  f.next_review_date,
  cr.reviewed_at,
  cr.quality,
  CASE 
    WHEN cr.quality >= 3 THEN 'Likely Correct'
    ELSE 'Likely Incorrect'
  END as inferred_result
FROM flashcards f
LEFT JOIN card_reviews cr ON f.id = cr.flashcard_id
WHERE f.user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND f.in_study_bank = true
  AND cr.reviewed_at IS NOT NULL
ORDER BY cr.reviewed_at DESC
LIMIT 20;

-- 4. Check if there are any cards that should have been reviewed but weren't
SELECT 
  COUNT(*) as cards_overdue_24h,
  COUNT(CASE WHEN next_review_date < NOW() - INTERVAL '48 hours' THEN 1 END) as cards_overdue_48h,
  COUNT(CASE WHEN next_review_date < NOW() - INTERVAL '7 days' THEN 1 END) as cards_overdue_7days
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
  AND next_review_date < NOW() - INTERVAL '24 hours';

-- 5. Show the review intervals being used
SELECT 
  box_number,
  COUNT(*) as card_count,
  MIN(next_review_date) as earliest_review,
  MAX(next_review_date) as latest_review,
  ROUND(AVG(EXTRACT(EPOCH FROM (next_review_date - created_at)) / 86400)::numeric, 1) as avg_days_until_review
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
GROUP BY box_number
ORDER BY box_number;

-- 6. Show cards by subject and their due status
SELECT 
  subject_name,
  COUNT(*) as total_cards,
  SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now,
  SUM(CASE WHEN box_number = 1 THEN 1 ELSE 0 END) as in_box_1,
  SUM(CASE WHEN box_number = 2 THEN 1 ELSE 0 END) as in_box_2,
  SUM(CASE WHEN box_number = 3 THEN 1 ELSE 0 END) as in_box_3,
  SUM(CASE WHEN box_number = 4 THEN 1 ELSE 0 END) as in_box_4,
  SUM(CASE WHEN box_number = 5 THEN 1 ELSE 0 END) as in_box_5
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
GROUP BY subject_name
ORDER BY subject_name;

-- 7. Show sample of cards that are due NOW
SELECT 
  id,
  LEFT(question, 60) as question,
  subject_name,
  box_number,
  created_at::date as created_date,
  next_review_date,
  ROUND(EXTRACT(EPOCH FROM (NOW() - next_review_date)) / 3600) as hours_overdue
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true
  AND next_review_date <= NOW()
ORDER BY next_review_date
LIMIT 20;

-- 8. Check active subjects vs cards
WITH active_subjects AS (
  SELECT ebs.subject_name
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  WHERE us.user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
)
SELECT 
  'Active Subjects' as category,
  string_agg(subject_name, ', ') as subjects
FROM active_subjects
UNION ALL
SELECT 
  'Card Subjects' as category,
  string_agg(DISTINCT subject_name, ', ') as subjects
FROM flashcards
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'
  AND in_study_bank = true;

-- 9. Check if any reviews exist at all
SELECT 
  COUNT(*) as total_reviews,
  MIN(reviewed_at) as first_review,
  MAX(reviewed_at) as last_review
FROM card_reviews
WHERE user_id = '289ca16e-8a89-4f1b-bc0f-5df41ebc1f80'; 