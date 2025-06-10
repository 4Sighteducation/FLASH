-- STEP 1: CLEAR EXISTING DATA (Dev Environment Only!)
-- Run this first to clear all existing curriculum topics
DELETE FROM curriculum_topics;

-- Verify it's empty
SELECT COUNT(*) as should_be_zero FROM curriculum_topics;

-- STEP 2: START WITH SMALLEST EXAM BOARD (CCEA A-Level - 41 rows)
-- This is a quick test to make sure everything works

-- 2A: Import CCEA A-Level Modules
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, ct.module_name, ct.module_name, 1,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name)
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL AND ct.module_name != '';

-- Check progress
SELECT 'CCEA A-Level Modules imported' as status, COUNT(*) as count 
FROM curriculum_topics WHERE topic_level = 1;

-- 2B: Import CCEA A-Level Topics
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, parent.id, ct.topic_name, ct.topic_name, 2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.topic_name)
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
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.topic_name IS NOT NULL AND ct.topic_name != '';

-- 2C: Import CCEA A-Level Sub Topics  
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, parent.id, ct.sub_topic_name, ct.sub_topic_name, 3,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.sub_topic_name)
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
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.sub_topic_name IS NOT NULL AND ct.sub_topic_name != '';

-- Verify CCEA import worked
SELECT 
    'CCEA A-Level Test Complete' as status,
    COUNT(*) as total_topics,
    COUNT(CASE WHEN topic_level = 1 THEN 1 END) as modules,
    COUNT(CASE WHEN topic_level = 2 THEN 1 END) as topics,
    COUNT(CASE WHEN topic_level = 3 THEN 1 END) as sub_topics
FROM curriculum_topics;

-- If the above worked (should show around 41 topics total), 
-- then proceed to STEP 3 in the next script 