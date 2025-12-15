-- Debug: Check if user subjects link to staging papers

-- First, see what user subjects you have
SELECT 
    us.id,
    us.exam_board,
    ebs.subject_name,
    ebs.subject_code,
    qt.code as qualification_type,
    eb.exam_board_name
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id  
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE us.user_id = 'e6c31ba9-ddf5-4c07-ad94-a36cdfd61c6b' -- Replace with your user ID
ORDER BY ebs.subject_name;

-- Then check if they match staging subjects
SELECT 
    us.exam_board,
    ebs.subject_name as prod_name,
    ebs.subject_code,
    qt.code as prod_qual_type,
    eb.exam_board_name as prod_exam_board,
    ss.subject_name as staging_name,
    ss.qualification_type as staging_qual_type,
    ss.exam_board as staging_exam_board,
    COUNT(p.id) as paper_count
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
LEFT JOIN staging_aqa_subjects ss ON (
    ss.subject_code = ebs.subject_code 
    AND ss.qualification_type = qt.code
    AND ss.exam_board = eb.exam_board_name
)
LEFT JOIN staging_aqa_exam_papers p ON p.subject_id = ss.id
WHERE us.user_id = 'e6c31ba9-ddf5-4c07-ad94-a36cdfd61c6b' -- Replace with your user ID
GROUP BY 
    us.exam_board, 
    ebs.subject_name, 
    ebs.subject_code, 
    qt.code, 
    eb.exam_board_name,
    ss.subject_name,
    ss.qualification_type,
    ss.exam_board;

