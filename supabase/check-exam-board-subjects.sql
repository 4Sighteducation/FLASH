-- Check what exam boards we have
SELECT code, full_name FROM exam_boards ORDER BY code;

-- Check what qualification types we have
SELECT code, name FROM qualification_types ORDER BY code;

-- Check if we have any exam_board_subjects
SELECT COUNT(*) as total_exam_board_subjects FROM exam_board_subjects;

-- Check exam_board_subjects with details
SELECT 
    eb.code as exam_board_code,
    qt.code as qualification_code,
    ebs.subject_name,
    ebs.id
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
ORDER BY eb.code, qt.code, ebs.subject_name
LIMIT 50;

-- Check specifically for A-Level subjects
SELECT 
    eb.code as exam_board,
    ebs.subject_name
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
ORDER BY eb.code, ebs.subject_name;

-- Check curriculum topics count
SELECT COUNT(*) as total_curriculum_topics FROM curriculum_topics; 