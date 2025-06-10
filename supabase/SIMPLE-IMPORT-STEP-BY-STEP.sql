-- SIMPLE STEP-BY-STEP IMPORT
-- This time we'll do it right!

-- ============================================
-- PART 1: Import A-LEVEL Topics (Smallest First)
-- ============================================

-- Start with CCEA A-Level (41 rows) as a test
-- Run each INSERT one at a time

-- 1A: CCEA A-Level Modules
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id,
    ct.module_name,
    ct.module_name,
    1,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name)
FROM cleaned_topics ct
-- This is the key: we join through exam_boards to ensure correct matching
INNER JOIN exam_boards eb ON eb.code = ct.exam_board
INNER JOIN qualification_types qt ON qt.code = ct.exam_type  
INNER JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id -- This ensures we only match subjects from the SAME exam board
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'CCEA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL 
  AND ct.module_name != '';

-- Check: Should see a small number of modules
SELECT 'CCEA A-Level Modules' as step, COUNT(*) as count FROM curriculum_topics WHERE topic_level = 1;

-- 1B: CCEA A-Level Topics (Level 2)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    parent.exam_board_subject_id,
    parent.id,
    ct.topic_name,
    ct.topic_name,
    2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.topic_name)
FROM cleaned_topics ct
INNER JOIN exam_boards eb ON eb.code = ct.exam_board
INNER JOIN qualification_types qt ON qt.code = ct.exam_type
INNER JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
INNER JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id 
    AND parent.topic_name = ct.module_name
    AND parent.topic_level = 1
WHERE ct.exam_board = 'CCEA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.topic_name IS NOT NULL 
  AND ct.topic_name != '';

-- 1C: CCEA A-Level Sub Topics (Level 3)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    module.exam_board_subject_id,
    parent.id,
    ct.sub_topic_name,
    ct.sub_topic_name,
    3,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.sub_topic_name)
FROM cleaned_topics ct
INNER JOIN exam_boards eb ON eb.code = ct.exam_board
INNER JOIN qualification_types qt ON qt.code = ct.exam_type
INNER JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
INNER JOIN curriculum_topics module ON 
    module.exam_board_subject_id = ebs.id 
    AND module.topic_name = ct.module_name
    AND module.topic_level = 1
INNER JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id 
    AND parent.parent_topic_id = module.id
    AND parent.topic_name = ct.topic_name
    AND parent.topic_level = 2
WHERE ct.exam_board = 'CCEA' 
  AND ct.exam_type = 'A_LEVEL'
  AND ct.sub_topic_name IS NOT NULL 
  AND ct.sub_topic_name != '';

-- FINAL CHECK for CCEA
SELECT 
    'CCEA A-Level Total' as exam_board,
    COUNT(*) as total_topics,
    SUM(CASE WHEN topic_level = 1 THEN 1 ELSE 0 END) as modules,
    SUM(CASE WHEN topic_level = 2 THEN 1 ELSE 0 END) as topics,
    SUM(CASE WHEN topic_level = 3 THEN 1 ELSE 0 END) as sub_topics
FROM curriculum_topics;

-- ============================================
-- IMPORTANT: If CCEA shows around 41 total topics, 
-- then the import is working correctly!
-- 
-- If it shows hundreds or thousands, STOP and let me know.
-- ============================================

-- Next steps:
-- 1. Replace 'CCEA' with 'SQA' in all 3 INSERTs above and run
-- 2. Then 'WJEC'
-- 3. Then 'EDEXCEL'  
-- 4. Then 'AQA'
-- 5. Then 'OCR'
-- 6. Finally, do the same for GCSE (change ct.exam_type = 'GCSE') 