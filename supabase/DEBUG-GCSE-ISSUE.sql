-- DEBUG GCSE ISSUE

-- 1. How many CCEA GCSE rows should we have?
SELECT 
    'Expected CCEA GCSE from cleaned_topics' as check,
    COUNT(*) as total_rows,
    COUNT(DISTINCT module_name) as unique_modules,
    COUNT(DISTINCT topic_name) as unique_topics
FROM cleaned_topics
WHERE exam_board = 'CCEA' AND exam_type = 'GCSE';

-- 2. Check what happened with modules (Level 1) - this looks OK at 3,485
SELECT 
    'CCEA GCSE Modules imported' as check,
    COUNT(*) as count,
    COUNT(DISTINCT topic_name) as unique_names
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE' AND ct.topic_level = 1;

-- 3. The problem: Check Level 2 topics - 109,276 is way too many!
-- Let's see what's being duplicated
SELECT 
    ct.topic_name,
    COUNT(*) as duplicate_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE' AND ct.topic_level = 2
GROUP BY ct.topic_name
HAVING COUNT(*) > 10
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 4. Check if subjects are duplicated for CCEA GCSE
SELECT 
    subject_name,
    COUNT(*) as count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE'
GROUP BY subject_name
HAVING COUNT(*) > 1;

-- 5. Let's trace a specific example
SELECT 
    ebs.id as exam_board_subject_id,
    eb.code as exam_board,
    ebs.subject_name,
    m.id as module_id,
    m.topic_name as module_name,
    COUNT(DISTINCT t.id) as topic_count
FROM curriculum_topics m
JOIN exam_board_subjects ebs ON m.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics t ON t.parent_topic_id = m.id AND t.topic_level = 2
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE' AND m.topic_level = 1
GROUP BY ebs.id, eb.code, ebs.subject_name, m.id, m.topic_name
HAVING COUNT(DISTINCT t.id) > 100
LIMIT 5; 