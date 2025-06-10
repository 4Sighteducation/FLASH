-- SAFE BATCH IMPORT FOR CURRICULUM TOPICS
-- This script imports topics in small batches to avoid timeouts
-- It handles foreign key constraints safely

-- STEP 1: Check current state
SELECT 'Current curriculum_topics count' as status, COUNT(*) as count FROM curriculum_topics;
SELECT 'Current user_topics count' as status, COUNT(*) as count FROM user_topics;
SELECT 'Current flashcards count' as status, COUNT(*) as count FROM flashcards;

-- STEP 2: Clear existing data (ONLY if you're sure!)
-- Uncomment the lines below after confirming you want to proceed
/*
DELETE FROM flashcards;
DELETE FROM user_topics;
DELETE FROM curriculum_topics;
*/

-- STEP 3: Import AQA A-Level Topics First (as a test)
-- 3A: Import Modules (Level 1) for AQA A-Level only
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id as exam_board_subject_id,
    ct.module_name as topic_name,
    ct.module_name as topic_code,
    1 as topic_level,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name) as sort_order
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'AQA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL 
  AND ct.module_name != ''
ON CONFLICT DO NOTHING;

-- Check how many modules were inserted
SELECT 'AQA A-Level Modules inserted' as status, COUNT(*) as count 
FROM curriculum_topics 
WHERE topic_level = 1;

-- 3B: Import Topics (Level 2) for AQA A-Level
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id as exam_board_subject_id,
    parent.id as parent_topic_id,
    ct.topic_name as topic_name,
    ct.topic_name as topic_code,
    2 as topic_level,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.topic_name) as sort_order
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id 
    AND parent.topic_name = ct.module_name
    AND parent.topic_level = 1
WHERE ct.exam_board = 'AQA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.topic_name IS NOT NULL 
  AND ct.topic_name != ''
ON CONFLICT DO NOTHING;

-- Check progress
SELECT 'Topics by level after AQA A-Level' as status, topic_level, COUNT(*) as count 
FROM curriculum_topics 
GROUP BY topic_level
ORDER BY topic_level;

-- 3C: Import Sub Topics (Level 3) for AQA A-Level
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id as exam_board_subject_id,
    parent.id as parent_topic_id,
    ct.sub_topic_name as topic_name,
    ct.sub_topic_name as topic_code,
    3 as topic_level,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.sub_topic_name) as sort_order
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
JOIN curriculum_topics module ON 
    module.exam_board_subject_id = ebs.id 
    AND module.topic_name = ct.module_name
    AND module.topic_level = 1
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id 
    AND parent.parent_topic_id = module.id
    AND parent.topic_name = ct.topic_name
    AND parent.topic_level = 2
WHERE ct.exam_board = 'AQA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.sub_topic_name IS NOT NULL 
  AND ct.sub_topic_name != ''
ON CONFLICT DO NOTHING;

-- Final check for AQA A-Level
SELECT 
    'AQA A-Level import complete' as status,
    topic_level,
    COUNT(*) as count 
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA'
GROUP BY topic_level
ORDER BY topic_level;

-- STEP 4: If AQA import worked, continue with other exam boards
-- Create similar blocks for each exam board:
-- - EDEXCEL
-- - OCR
-- - WJEC
-- - CCEA
-- - SQA

-- Just change WHERE ct.exam_board = 'AQA' to the appropriate exam board code 