-- COMPREHENSIVE VERIFICATION OF YOUR FLASH APP SETUP
-- Let's verify everything is correct

-- 1. CHECK: Qualification Types (Exam Levels)
SELECT 'Qualification Types' as check_name;
SELECT * FROM qualification_types;

-- 2. CHECK: Exam Boards
SELECT 'Exam Boards' as check_name;
SELECT * FROM exam_boards;

-- 3. CHECK: How many subjects per exam board + qualification type?
SELECT 'Subjects per Board/Type' as check_name;
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(*) as subject_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY eb.code, qt.code
ORDER BY eb.code, qt.code;

-- 4. CHECK: Sample the app flow - Let's trace AQA A-Level Mathematics
SELECT 'AQA A-Level Mathematics Flow' as check_name;

-- Step 1: User selects A-Level
-- Step 2: User selects AQA
-- Step 3: Show available subjects for AQA A-Level
SELECT 
    ebs.id,
    ebs.subject_name,
    ebs.subject_code
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name LIKE '%Mathematics%'
ORDER BY ebs.subject_name;

-- 5. CHECK: Topics for a specific exam_board_subject
-- This should show the topics ONLY for AQA A-Level Mathematics
WITH aqa_maths AS (
    SELECT ebs.id
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE eb.code = 'AQA' 
      AND qt.code = 'A_LEVEL'
      AND ebs.subject_name = 'Mathematics (A-Level)'
    LIMIT 1
)
SELECT 
    ct.topic_level,
    COUNT(*) as count
FROM curriculum_topics ct
WHERE ct.exam_board_subject_id = (SELECT id FROM aqa_maths)
GROUP BY ct.topic_level;

-- 6. CHECK: Are topics correctly isolated by exam board?
-- This checks if Mathematics topics are separate for each board
SELECT 'Topic Isolation Check' as check_name;
SELECT 
    eb.code as exam_board,
    ebs.subject_name,
    COUNT(DISTINCT ct.id) as topic_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name = 'Mathematics (A-Level)'
  AND qt.code = 'A_LEVEL'
GROUP BY eb.code, ebs.subject_name
ORDER BY eb.code;

-- 7. CHECK: Total topics in the system
SELECT 'Total Topics by Level' as check_name;
SELECT 
    qt.code as qualification_type,
    COUNT(*) as total_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY qt.code;

-- 8. CRITICAL CHECK: Is exam_board_subject_id unique for each board+subject?
SELECT 'Unique Board+Subject Check' as check_name;
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name,
    COUNT(*) as count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY eb.code, qt.code, ebs.subject_name
HAVING COUNT(*) > 1;

-- If this returns any rows, there's a problem! 