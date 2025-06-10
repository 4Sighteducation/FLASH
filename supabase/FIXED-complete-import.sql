-- FIXED IMPORT SCRIPT - This one works correctly!
-- The fix: We now match on BOTH exam_board AND subject_name

-- STEP 1: Clear everything and start fresh
DELETE FROM curriculum_topics;

-- Verify it's empty
SELECT COUNT(*) as should_be_zero FROM curriculum_topics;

-- STEP 2: Test with CCEA A-Level first (41 rows)
-- 2A: Import Modules
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id, ct.module_name, ct.module_name, 1,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name)
FROM cleaned_topics ct
JOIN exam_boards eb ON eb.code = ct.exam_board -- FIXED: Match exam board
JOIN qualification_types qt ON qt.code = ct.exam_type
JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id -- This ensures we only get subjects from the SAME exam board
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'CCEA' AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL AND ct.module_name != '';

-- 2B: Import Topics  
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

-- 2C: Import Sub Topics
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

-- CHECK: This should show around 41 topics for CCEA, not thousands!
SELECT 
    eb.code as exam_board,
    COUNT(*) as total_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
GROUP BY eb.code;

-- If CCEA shows the correct count (~41), continue with other exam boards
-- using the same pattern. The key is the JOIN condition ensures we only
-- match subjects within the SAME exam board. 