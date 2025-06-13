-- Debug Card Counts for User
-- Replace 'YOUR_USER_ID' with the actual user ID

-- 1. Get user's active subjects
SELECT 
  us.user_id,
  ebs.subject_name,
  us.exam_board
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
WHERE us.user_id = 'YOUR_USER_ID';

-- 2. Count all cards by subject
SELECT 
  subject_name,
  COUNT(*) as total_cards,
  SUM(CASE WHEN in_study_bank = true THEN 1 ELSE 0 END) as in_study_bank,
  SUM(CASE WHEN in_study_bank = true AND next_review_date <= NOW() THEN 1 ELSE 0 END) as due_now
FROM flashcards
WHERE user_id = 'YOUR_USER_ID'
GROUP BY subject_name
ORDER BY subject_name;

-- 3. Show orphaned cards (cards from subjects user doesn't have)
WITH active_subjects AS (
  SELECT ebs.subject_name
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  WHERE us.user_id = 'YOUR_USER_ID'
)
SELECT 
  f.subject_name,
  COUNT(*) as orphaned_count,
  SUM(CASE WHEN f.in_study_bank = true THEN 1 ELSE 0 END) as orphaned_in_study
FROM flashcards f
WHERE f.user_id = 'YOUR_USER_ID'
  AND f.subject_name NOT IN (SELECT subject_name FROM active_subjects)
GROUP BY f.subject_name;

-- 4. Box distribution for active subjects only
WITH active_subjects AS (
  SELECT ebs.subject_name
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  WHERE us.user_id = 'YOUR_USER_ID'
)
SELECT 
  box_number,
  COUNT(*) as card_count
FROM flashcards f
WHERE f.user_id = 'YOUR_USER_ID'
  AND f.in_study_bank = true
  AND f.subject_name IN (SELECT subject_name FROM active_subjects)
GROUP BY box_number
ORDER BY box_number;

-- 5. Cards due by subject (active subjects only)
WITH active_subjects AS (
  SELECT ebs.subject_name
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  WHERE us.user_id = 'YOUR_USER_ID'
)
SELECT 
  subject_name,
  COUNT(*) as due_count
FROM flashcards f
WHERE f.user_id = 'YOUR_USER_ID'
  AND f.in_study_bank = true
  AND f.next_review_date <= NOW()
  AND f.subject_name IN (SELECT subject_name FROM active_subjects)
GROUP BY subject_name;

-- 6. Sample of due cards with details
WITH active_subjects AS (
  SELECT ebs.subject_name
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  WHERE us.user_id = 'YOUR_USER_ID'
)
SELECT 
  subject_name,
  box_number,
  next_review_date,
  LEFT(question, 50) as question_preview
FROM flashcards f
WHERE f.user_id = 'YOUR_USER_ID'
  AND f.in_study_bank = true
  AND f.next_review_date <= NOW()
  AND f.subject_name IN (SELECT subject_name FROM active_subjects)
ORDER BY next_review_date
LIMIT 10; 