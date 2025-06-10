-- CHECK CURRENT STATE BEFORE IMPORT
-- Run each section and share the results

-- 1. Check if cleaned_topics table exists and has data
SELECT 
    'cleaned_topics table' as check_item,
    COUNT(*) as row_count,
    COUNT(DISTINCT exam_board) as exam_boards,
    COUNT(DISTINCT exam_type) as exam_types,
    COUNT(DISTINCT subject_name) as subjects
FROM cleaned_topics;

-- 2. Check current curriculum_topics status
SELECT 
    'curriculum_topics table' as check_item,
    COUNT(*) as total_topics,
    COUNT(DISTINCT topic_level) as levels
FROM curriculum_topics;

-- 3. Check user_topics (to see if we'll lose user data)
SELECT 
    'user_topics table' as check_item,
    COUNT(*) as total_user_topics,
    COUNT(DISTINCT user_id) as unique_users
FROM user_topics;

-- 4. Check exam_board_subjects for A-Level
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(*) as subject_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code, qt.code
ORDER BY eb.code;

-- 5. Sample data from cleaned_topics
SELECT * FROM cleaned_topics 
WHERE exam_board = 'AQA' AND exam_type = 'A_LEVEL'
LIMIT 5;

-- 6. Check foreign key constraints
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name = 'curriculum_topics'; 