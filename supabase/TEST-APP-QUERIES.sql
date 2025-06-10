-- TEST QUERIES TO DEBUG WHY APP ISN'T SHOWING TOPICS

-- 1. First, let's see ALL the subjects that have topics
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name,
    ebs.id as exam_board_subject_id,
    COUNT(ct.id) as topic_count
FROM exam_board_subjects ebs
JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY eb.code, qt.code, ebs.subject_name, ebs.id
ORDER BY eb.code, qt.code, ebs.subject_name
LIMIT 10;

-- 2. Test query for your app - get topics for a specific subject
-- Replace the IDs with actual values from your app
-- This is what your app should be doing:

-- Step 1: Get the exam_board_subject_id
SELECT 
    ebs.id,
    ebs.subject_name,
    eb.code as exam_board,
    qt.code as qualification_type
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name = 'Mathematics (A-Level)';

-- Step 2: Get modules (level 1 topics) for that subject
-- Use the ID from step 1 (example: 'd64ac834-3c3f-4c84-be9f-c2dc67b5e8f2')
SELECT 
    id,
    topic_name,
    topic_level,
    sort_order
FROM curriculum_topics
WHERE exam_board_subject_id = 'd64ac834-3c3f-4c84-be9f-c2dc67b5e8f2'  -- Replace with actual ID
  AND topic_level = 1
ORDER BY sort_order;

-- 3. Check if your app might be using subject_id instead of exam_board_subject_id
-- This would be WRONG and return nothing:
SELECT * FROM curriculum_topics WHERE subject_id = 'some-id' LIMIT 5;

-- 4. The correct column is exam_board_subject_id:
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'curriculum_topics'
ORDER BY ordinal_position;

-- 5. Let's check a few different subjects to make sure they all have topics
WITH subject_samples AS (
    SELECT 
        ebs.id,
        eb.code as exam_board,
        qt.code as qualification_type,
        ebs.subject_name
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE qt.code = 'A_LEVEL'
    LIMIT 5
)
SELECT 
    ss.*,
    COUNT(ct.id) as topic_count
FROM subject_samples ss
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ss.id
GROUP BY ss.id, ss.exam_board, ss.qualification_type, ss.subject_name; 