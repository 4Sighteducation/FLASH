-- CONTINUE IMPORT - A-LEVEL EXAM BOARDS
-- Run each section one at a time to avoid timeouts

-- STEP 3: SQA A-LEVEL (304 rows)
-- 3A: Modules
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
WHERE ct.exam_board = 'SQA' AND ct.exam_type = 'A_LEVEL'
  AND ct.module_name IS NOT NULL AND ct.module_name != '';

-- 3B: Topics
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
WHERE ct.exam_board = 'SQA' AND ct.exam_type = 'A_LEVEL'
  AND ct.topic_name IS NOT NULL AND ct.topic_name != '';

-- 3C: Sub Topics
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
WHERE ct.exam_board = 'SQA' AND ct.exam_type = 'A_LEVEL'
  AND ct.sub_topic_name IS NOT NULL AND ct.sub_topic_name != '';

-- Check progress
SELECT 'After SQA A-Level' as checkpoint, COUNT(*) as total_topics FROM curriculum_topics;

-- STEP 4: WJEC A-LEVEL (1,002 rows)
-- Copy the 3 INSERT statements above and change 'SQA' to 'WJEC'

-- STEP 5: EDEXCEL A-LEVEL (1,352 rows)  
-- Copy the 3 INSERT statements above and change 'SQA' to 'EDEXCEL'

-- STEP 6: AQA A-LEVEL (2,042 rows)
-- Copy the 3 INSERT statements above and change 'SQA' to 'AQA'

-- STEP 7: OCR A-LEVEL (2,511 rows)
-- Copy the 3 INSERT statements above and change 'SQA' to 'OCR'

-- FINAL CHECK FOR ALL A-LEVELS
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(DISTINCT ct.id) as total_topics,
    COUNT(DISTINCT CASE WHEN ct.topic_level = 1 THEN ct.id END) as modules,
    COUNT(DISTINCT CASE WHEN ct.topic_level = 2 THEN ct.id END) as topics,
    COUNT(DISTINCT CASE WHEN ct.topic_level = 3 THEN ct.id END) as sub_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code, qt.code
ORDER BY eb.code; 