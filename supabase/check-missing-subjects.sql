-- 1. Check if we have any orphaned curriculum topics (topics without exam_board_subjects)
SELECT COUNT(*) as orphaned_topics
FROM curriculum_topics
WHERE exam_board_subject_id NOT IN (SELECT id FROM exam_board_subjects);

-- 2. Check the metadata field in curriculum_topics for clues about exam boards/types
SELECT 
    id,
    topic_name,
    topic_level,
    metadata,
    exam_board_subject_id
FROM curriculum_topics
WHERE metadata IS NOT NULL
LIMIT 10;

-- 3. Look for patterns in topic names that might indicate A-Level content
SELECT 
    topic_name,
    topic_level,
    exam_board_subject_id
FROM curriculum_topics
WHERE topic_level = 1
AND (
    topic_name LIKE '%A Level%' 
    OR topic_name LIKE '%A-Level%'
    OR topic_name LIKE '%AS Level%'
    OR topic_name LIKE '%A2%'
)
LIMIT 20;

-- 4. Count topics by exam_board_subject_id to see distribution
SELECT 
    exam_board_subject_id,
    COUNT(*) as topic_count
FROM curriculum_topics
GROUP BY exam_board_subject_id
ORDER BY topic_count DESC
LIMIT 10;

-- 5. Check if the original import might have mixed everything under GCSE
SELECT DISTINCT
    ebs.id,
    ebs.subject_name,
    eb.code as exam_board,
    qt.code as qualification_type
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name IN ('Mathematics', 'Physics', 'Chemistry', 'Biology')
ORDER BY ebs.subject_name, eb.code; 