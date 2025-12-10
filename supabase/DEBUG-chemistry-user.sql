-- ============================================
-- DEBUG: Chemistry user hierarchy
-- Using CORRECT user ID: da52b509-99df-4743-bf36-d3fd1858d0a6
-- ============================================

-- Step 1: Does THIS user have Chemistry flashcards?
SELECT 
    'Current user flashcards' as test,
    COUNT(*) as total_cards,
    COUNT(DISTINCT topic_id) as unique_topics,
    STRING_AGG(DISTINCT subject_name, ', ') as subjects
FROM flashcards
WHERE user_id = 'da52b509-99df-4743-bf36-d3fd1858d0a6';

-- Step 2: What are the actual topic details?
SELECT 
    'Topic details' as test,
    f.subject_name as flashcard_subject,
    ct.topic_name,
    ct.topic_level,
    ct.parent_topic_id,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    ebs.subject_name as curriculum_subject_name,
    COUNT(f.id) as card_count
FROM flashcards f
LEFT JOIN curriculum_topics ct ON ct.id = f.topic_id
LEFT JOIN curriculum_topics parent ON parent.id = ct.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
WHERE f.user_id = 'da52b509-99df-4743-bf36-d3fd1858d0a6'
GROUP BY f.subject_name, ct.topic_name, ct.topic_level, ct.parent_topic_id, 
         parent.topic_name, grandparent.topic_name, ebs.subject_name
ORDER BY ct.topic_level;

-- Step 3: Test the function with correct user
SELECT * FROM get_user_topics_with_hierarchy(
  'da52b509-99df-4743-bf36-d3fd1858d0a6',
  'Chemistry (A-Level)' -- Exact match from flashcards
);

-- Step 4: If no results, try without specifying subject (get all)
WITH user_topic_cards AS (
    SELECT 
      f.topic_id,
      f.subject_name as flashcard_subject,
      COUNT(*) as card_count
    FROM flashcards f
    WHERE f.user_id = 'da52b509-99df-4743-bf36-d3fd1858d0a6'
    GROUP BY f.topic_id, f.subject_name
)
SELECT 
  'All topics for this user' as test,
  t.id as topic_id,
  t.topic_name,
  t.topic_level,
  parent.topic_name as parent_name,
  grandparent.topic_name as grandparent_name,
  ebs.subject_name as curriculum_subject,
  utc.flashcard_subject,
  utc.card_count
FROM curriculum_topics t
INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
ORDER BY t.topic_level;

