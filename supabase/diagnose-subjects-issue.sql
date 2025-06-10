-- 1. Check if exam_board_subjects has any data
SELECT COUNT(*) as total_exam_board_subjects FROM exam_board_subjects;

-- 2. Check unique exam_board_subject_ids in curriculum_topics
SELECT COUNT(DISTINCT exam_board_subject_id) as unique_subject_ids 
FROM curriculum_topics 
WHERE exam_board_subject_id IS NOT NULL;

-- 3. Sample some exam_board_subject_ids to see if they exist in exam_board_subjects
WITH sample_ids AS (
    SELECT DISTINCT exam_board_subject_id 
    FROM curriculum_topics 
    WHERE exam_board_subject_id IS NOT NULL 
    LIMIT 5
)
SELECT 
    si.exam_board_subject_id,
    ebs.id as found_in_exam_board_subjects,
    ebs.subject_name,
    eb.code as exam_board,
    qt.code as qualification_type
FROM sample_ids si
LEFT JOIN exam_board_subjects ebs ON si.exam_board_subject_id = ebs.id
LEFT JOIN exam_boards eb ON ebs.exam_board_id = eb.id
LEFT JOIN qualification_types qt ON ebs.qualification_type_id = qt.id;

-- 4. If exam_board_subjects is populated, check for A-Level subjects specifically
SELECT 
    eb.code as exam_board,
    COUNT(*) as subject_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code
ORDER BY eb.code;

-- 5. Check all qualification types that have subjects
SELECT 
    qt.code as qualification_type,
    COUNT(DISTINCT ebs.id) as subject_count
FROM exam_board_subjects ebs
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY qt.code
ORDER BY qt.code; 