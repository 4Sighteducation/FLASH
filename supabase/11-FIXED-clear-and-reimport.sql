-- FIXED IMPORT SCRIPT - Properly matches exam board AND subject

-- STEP 1: Clear everything and start fresh
DELETE FROM curriculum_topics;

-- STEP 2: Import with FIXED joins (includes exam board in all joins)
-- Test with CCEA A-Level first

-- 2A: Import Modules (Level 1)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, ct.module_name, ct.module_name, 1,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name)
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board -- Match exact exam board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id -- Must be same exam board
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL AND ct.module_name != '';

-- Check count
SELECT 'CCEA Modules' as stage, COUNT(*) FROM curriculum_topics WHERE topic_level = 1;

-- 2B: Import Topics (Level 2)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, parent.id, ct.topic_name, ct.topic_name, 2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.topic_name)
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board -- Match exact exam board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id -- Must be same exam board
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id -- Parent must belong to same subject
    AND parent.topic_name = ct.module_name
    AND parent.topic_level = 1
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.topic_name IS NOT NULL AND ct.topic_name != '';

-- 2C: Import Sub Topics (Level 3)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, parent.id, ct.sub_topic_name, ct.sub_topic_name, 3,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ct.sub_topic_name)
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board -- Match exact exam board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id -- Must be same exam board
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
JOIN curriculum_topics module ON 
    module.exam_board_subject_id = ebs.id -- Module must belong to same subject
    AND module.topic_name = ct.module_name
    AND module.topic_level = 1
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id -- Parent must belong to same subject
    AND parent.parent_topic_id = module.id
    AND parent.topic_name = ct.topic_name
    AND parent.topic_level = 2
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.sub_topic_name IS NOT NULL AND ct.sub_topic_name != '';

-- Verify CCEA looks correct (should be around 41 topics, not hundreds)
SELECT 
    eb.code,
    COUNT(*) as total_topics,
    COUNT(CASE WHEN topic_level = 1 THEN 1 END) as modules,
    COUNT(CASE WHEN topic_level = 2 THEN 1 END) as topics,
    COUNT(CASE WHEN topic_level = 3 THEN 1 END) as sub_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
GROUP BY eb.code; 