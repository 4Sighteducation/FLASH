-- FRESH START WITH VERIFIED APPROACH
-- Your schema is CORRECT! Let's import carefully.

-- ==============================================
-- STEP 1: CLEAR ALL TOPICS (Keep boards & subjects)
-- ==============================================
DELETE FROM flashcards;
DELETE FROM user_topics;
DELETE FROM curriculum_topics;

-- Verify empty
SELECT 'After clearing' as status, COUNT(*) as topic_count FROM curriculum_topics;

-- ==============================================
-- STEP 2: VERIFY YOUR DATA BEFORE IMPORT
-- ==============================================

-- Check what we're about to import
SELECT 
    'Data to import' as check_type,
    exam_type,
    exam_board,
    COUNT(*) as row_count,
    COUNT(DISTINCT subject_name) as subjects,
    COUNT(DISTINCT module_name) as modules
FROM cleaned_topics
GROUP BY exam_type, exam_board
ORDER BY exam_type, exam_board;

-- ==============================================
-- STEP 3: IMPORT ONE SMALL TEST CASE
-- Let's start with AQA A-Level Mathematics ONLY
-- ==============================================

-- First, find the exam_board_subject_id for AQA A-Level Mathematics
SELECT 
    ebs.id as exam_board_subject_id,
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name = 'Mathematics (A-Level)';

-- Import modules for AQA A-Level Mathematics ONLY
WITH target_subject AS (
    SELECT ebs.id
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE eb.code = 'AQA' 
      AND qt.code = 'A_LEVEL'
      AND ebs.subject_name = 'Mathematics (A-Level)'
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ts.id,
    ct.module_name,
    ct.module_name,
    1,
    ROW_NUMBER() OVER (ORDER BY ct.module_name)
FROM cleaned_topics ct
CROSS JOIN target_subject ts
WHERE ct.exam_board = 'AQA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.subject_name = 'Mathematics (A-Level)'
  AND ct.module_name IS NOT NULL 
  AND ct.module_name != '';

-- Check what we imported
SELECT 
    'AQA A-Level Maths Modules' as what,
    COUNT(*) as count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name = 'Mathematics (A-Level)';

-- ==============================================
-- STOP HERE AND CHECK!
-- If the count looks reasonable (maybe 5-10 modules),
-- then we can continue with topics and subtopics
-- ==============================================

-- Sample what we imported
SELECT 
    eb.code as exam_board,
    ebs.subject_name,
    ct.topic_name as module_name,
    ct.topic_level
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name = 'Mathematics (A-Level)'
LIMIT 10; 