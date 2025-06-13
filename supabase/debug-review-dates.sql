-- Debug Review Dates for User
-- Replace 'YOUR_USER_ID' with the actual user ID

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
      EXTRACT(EPOCH FROM (next_review_date - NOW())) / 3600 || ' hours'
    ELSE 
      'Overdue by ' || EXTRACT(EPOCH FROM (NOW() - next_review_date)) / 3600 || ' hours'
  END as time_until_due
FROM flashcards
WHERE user_id = 'YOUR_USER_ID'
  AND in_study_bank = true
ORDER BY next_review_date;

-- 2. Count cards by box and due status
SELECT 
  box_number,
  COUNT(*) as total_cards,
  SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now,
  SUM(CASE WHEN next_review_date > NOW() THEN 1 ELSE 0 END) as not_due_yet
FROM flashcards
WHERE user_id = 'YOUR_USER_ID'
  AND in_study_bank = true
GROUP BY box_number
ORDER BY box_number;

-- 3. Show review history to understand box progression
SELECT 
  f.id,
  LEFT(f.question, 30) as question,
  f.box_number,
  f.next_review_date,
  cr.reviewed_at,
  cr.was_correct,
  cr.quality
FROM flashcards f
LEFT JOIN card_reviews cr ON f.id = cr.flashcard_id
WHERE f.user_id = 'YOUR_USER_ID'
  AND f.in_study_bank = true
ORDER BY cr.reviewed_at DESC
LIMIT 20;

-- 4. Check if there are any cards that should have been reviewed but weren't
SELECT 
  COUNT(*) as cards_overdue_24h
FROM flashcards
WHERE user_id = 'YOUR_USER_ID'
  AND in_study_bank = true
  AND next_review_date < NOW() - INTERVAL '24 hours';

-- 5. Show the review intervals being used
SELECT DISTINCT
  box_number,
  COUNT(*) as card_count,
  MIN(next_review_date) as earliest_review,
  MAX(next_review_date) as latest_review,
  AVG(EXTRACT(EPOCH FROM (next_review_date - created_at)) / 86400)::INT as avg_days_until_review
FROM flashcards
WHERE user_id = 'YOUR_USER_ID'
  AND in_study_bank = true
GROUP BY box_number
ORDER BY box_number; 