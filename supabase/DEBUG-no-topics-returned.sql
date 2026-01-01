-- ============================================
-- DEBUG: Why get_user_topics_with_hierarchy returns no rows
-- ============================================

-- Step 1: Does this user have flashcards?
SELECT 
    'User flashcards check' as test,
    COUNT(*) as total_cards,
    COUNT(DISTINCT topic_id) as unique_topics,
    COUNT(DISTINCT subject_name) as unique_subjects
FROM flashcards
WHERE user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513';

-- Step 2: What subject names do the flashcards have?
SELECT DISTINCT 
    'Flashcard subject names' as test,
    subject_name,
    COUNT(*) as card_count
FROM flashcards
WHERE user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
GROUP BY subject_name;

-- Step 3: What subject names exist in exam_board_subjects?
SELECT 
    'exam_board_subjects names' as test,
    id,
    subject_name,
    exam_board
FROM exam_board_subjects
WHERE subject_name LIKE '%Chemistry%'
ORDER BY subject_name;

-- Step 4: What are the topic_ids from flashcards?
SELECT DISTINCT 
    'Flashcard topic_ids' as test,
    f.topic_id,
    f.subject_name,
    ct.topic_name,
    ct.topic_level,
    ebs.subject_name as curriculum_subject_name
FROM flashcards f
LEFT JOIN curriculum_topics ct ON ct.id = f.topic_id
LEFT JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
WHERE f.user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
  AND f.subject_name LIKE '%Chemistry%';

-- Step 5: The actual function query broken down
WITH user_topic_cards AS (
    SELECT 
      f.topic_id,
      COUNT(*) as card_count,
      COUNT(*) FILTER (WHERE f.box_number >= 4) as cards_mastered,
      MAX(cr.reviewed_at) as last_studied
    FROM flashcards f
    LEFT JOIN card_reviews cr ON cr.flashcard_id = f.id
    WHERE f.user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
    GROUP BY f.topic_id
)
SELECT 
  'User topic cards CTE' as test,
  t.id as topic_id,
  t.topic_name,
  t.topic_level,
  ebs.subject_name as exam_board_subject_name,
  utc.card_count
FROM curriculum_topics t
INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
WHERE ebs.subject_name = 'Chemistry (A-Level)'
ORDER BY t.topic_name;

-- Step 6: Try with different subject name variations
WITH user_topic_cards AS (
    SELECT 
      f.topic_id,
      COUNT(*) as card_count
    FROM flashcards f
    WHERE f.user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
    GROUP BY f.topic_id
)
SELECT 
  'Try variations' as test,
  ebs.subject_name,
  COUNT(*) as matching_topics
FROM curriculum_topics t
INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
GROUP BY ebs.subject_name
ORDER BY matching_topics DESC;


