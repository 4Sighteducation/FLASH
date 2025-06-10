-- IMPORT GCSE TOPICS
-- After A-Levels are done, run this for GCSE

-- Check how many we're about to import
SELECT 
    exam_board,
    COUNT(*) as gcse_rows
FROM cleaned_topics
WHERE exam_type = 'GCSE'
GROUP BY exam_board
ORDER BY COUNT(*);

-- Start with smallest GCSE exam board (SQA - 363 rows)
-- Then: EDEXCEL (1,627), WJEC (1,268), OCR (1,401), AQA (1,685), CCEA (3,239)

-- GCSE IMPORT TEMPLATE
-- Replace {EXAM_BOARD} with: SQA, EDEXCEL, WJEC, OCR, AQA, CCEA

-- Modules
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
WHERE ct.exam_board = '{EXAM_BOARD}' AND ct.exam_type = 'GCSE'
  AND ct.module_name IS NOT NULL AND ct.module_name != '';

-- Topics
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
WHERE ct.exam_board = '{EXAM_BOARD}' AND ct.exam_type = 'GCSE'
  AND ct.topic_name IS NOT NULL AND ct.topic_name != '';

-- Sub Topics
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
WHERE ct.exam_board = '{EXAM_BOARD}' AND ct.exam_type = 'GCSE'
  AND ct.sub_topic_name IS NOT NULL AND ct.sub_topic_name != '';

-- Check progress after each exam board
SELECT 'After {EXAM_BOARD} GCSE' as checkpoint, COUNT(*) as total_topics FROM curriculum_topics;

-- FINAL COMPLETE CHECK
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(DISTINCT ct.id) as total_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY eb.code, qt.code
ORDER BY eb.code, qt.code; 