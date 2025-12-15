-- Check actual column names in exam_boards table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'exam_boards'
ORDER BY ordinal_position;

-- See what exam boards exist
SELECT * FROM exam_boards LIMIT 10;

-- Check exam_board_subjects columns
SELECT column_name, data_type  
FROM information_schema.columns
WHERE table_name = 'exam_board_subjects'
ORDER BY ordinal_position;

-- Check your actual user subjects
SELECT 
    us.*,
    ebs.*
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
LIMIT 5;

