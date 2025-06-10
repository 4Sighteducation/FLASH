-- DIAGNOSE SQA DUPLICATION ISSUE

-- 1. Check how many SQA A-Level rows we should have
SELECT 
    'Expected SQA A-Level rows from cleaned_topics' as check,
    COUNT(*) as count
FROM cleaned_topics
WHERE exam_board = 'SQA' AND exam_type = 'A_LEVEL';

-- 2. Check how many SQA A-Level subjects exist
SELECT 
    'SQA A-Level subjects in exam_board_subjects' as check,
    COUNT(*) as count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'SQA' AND qt.code = 'A_LEVEL';

-- 3. Check for duplicate subject names
SELECT 
    ebs.subject_name,
    COUNT(*) as duplicate_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY ebs.subject_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 4. Check SQA modules - are they duplicated?
SELECT 
    topic_name,
    COUNT(*) as count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'SQA' AND ct.topic_level = 1
GROUP BY topic_name
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 5. Sample the issue - show some SQA topics with their hierarchy
SELECT 
    eb.code as exam_board,
    ebs.subject_name,
    m.topic_name as module_name,
    t.topic_name as topic_name,
    st.topic_name as sub_topic_name
FROM curriculum_topics m
JOIN exam_board_subjects ebs ON m.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
LEFT JOIN curriculum_topics t ON t.parent_topic_id = m.id AND t.topic_level = 2
LEFT JOIN curriculum_topics st ON st.parent_topic_id = t.id AND st.topic_level = 3
WHERE eb.code = 'SQA' AND m.topic_level = 1
LIMIT 20;

-- 6. The likely culprit - check if subject names are being matched across exam boards
SELECT DISTINCT
    ct.exam_board,
    ct.subject_name,
    eb.code as matched_exam_board,
    ebs.id as exam_board_subject_id
FROM cleaned_topics ct
JOIN exam_board_subjects ebs ON ebs.subject_name = ct.subject_name
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ct.exam_board = 'SQA' 
  AND ct.exam_type = 'A_LEVEL'
  AND qt.code = 'A_LEVEL'
ORDER BY ct.subject_name; 