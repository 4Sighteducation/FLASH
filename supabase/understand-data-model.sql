-- Let's understand the data model properly

-- 1. Show me some exam_board_subjects entries
SELECT 
    ebs.id,
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name LIKE '%Mathematics%'
AND qt.code = 'A_LEVEL'
ORDER BY eb.code;

-- 2. Show me what's in cleaned_topics for Mathematics
SELECT 
    exam_board,
    exam_type,
    subject_name,
    COUNT(*) as topic_count
FROM cleaned_topics
WHERE subject_name LIKE '%Mathematics%'
AND exam_type = 'A_LEVEL'
GROUP BY exam_board, exam_type, subject_name
ORDER BY exam_board;

-- 3. Are module names unique within an exam board + subject?
SELECT 
    exam_board,
    subject_name,
    module_name,
    COUNT(*) as occurrences
FROM cleaned_topics
WHERE exam_type = 'A_LEVEL'
GROUP BY exam_board, subject_name, module_name
HAVING COUNT(*) > 1
LIMIT 10;

-- 4. Sample of the actual data structure
SELECT * FROM cleaned_topics
WHERE exam_board = 'AQA' 
AND exam_type = 'A_LEVEL'
AND subject_name LIKE '%Mathematics%'
LIMIT 10; 