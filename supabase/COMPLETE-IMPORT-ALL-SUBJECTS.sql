-- COMPLETE IMPORT FOR ALL SUBJECTS AND EXAM BOARDS
-- Run each section one at a time to avoid timeouts

-- ================================================
-- SECTION 1: Import ALL A-LEVEL subjects
-- ================================================

-- 1A: Import ALL A-Level Modules (Level 1)
WITH distinct_modules AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        ct.module_name
    FROM cleaned_topics ct
    JOIN exam_boards eb ON eb.code = ct.exam_board
    JOIN qualification_types qt ON qt.code = ct.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ct.subject_name
    WHERE ct.exam_type = 'A_LEVEL'
      AND ct.module_name IS NOT NULL 
      AND ct.module_name != ''
      -- Skip already imported AQA Mathematics
      AND NOT (ct.exam_board = 'AQA' AND ct.subject_name = 'Mathematics (A-Level)')
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    module_name,
    module_name,
    1,
    ROW_NUMBER() OVER (PARTITION BY exam_board_subject_id ORDER BY module_name)
FROM distinct_modules;

-- Check progress
SELECT 
    'A-Level Modules imported' as status,
    eb.code as exam_board,
    COUNT(*) as module_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL' AND ct.topic_level = 1
GROUP BY eb.code
ORDER BY eb.code;

-- 1B: Import ALL A-Level Topics (Level 2)
WITH distinct_topics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        ct.module_name,
        ct.topic_name
    FROM cleaned_topics ct
    JOIN exam_boards eb ON eb.code = ct.exam_board
    JOIN qualification_types qt ON qt.code = ct.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ct.subject_name
    WHERE ct.exam_type = 'A_LEVEL'
      AND ct.topic_name IS NOT NULL 
      AND ct.topic_name != ''
      AND NOT (ct.exam_board = 'AQA' AND ct.subject_name = 'Mathematics (A-Level)')
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    dt.exam_board_subject_id,
    parent.id,
    dt.topic_name,
    dt.topic_name,
    2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY dt.topic_name)
FROM distinct_topics dt
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = dt.exam_board_subject_id
    AND parent.topic_name = dt.module_name
    AND parent.topic_level = 1;

-- Check progress
SELECT 
    'A-Level Topics imported' as status,
    eb.code as exam_board,
    SUM(CASE WHEN ct.topic_level = 1 THEN 1 ELSE 0 END) as modules,
    SUM(CASE WHEN ct.topic_level = 2 THEN 1 ELSE 0 END) as topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code
ORDER BY eb.code;

-- 1C: Import ALL A-Level Sub Topics (Level 3)
WITH distinct_subtopics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        ct.module_name,
        ct.topic_name,
        ct.sub_topic_name
    FROM cleaned_topics ct
    JOIN exam_boards eb ON eb.code = ct.exam_board
    JOIN qualification_types qt ON qt.code = ct.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ct.subject_name
    WHERE ct.exam_type = 'A_LEVEL'
      AND ct.sub_topic_name IS NOT NULL 
      AND ct.sub_topic_name != ''
      AND NOT (ct.exam_board = 'AQA' AND ct.subject_name = 'Mathematics (A-Level)')
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    module.exam_board_subject_id,
    topic.id,
    dst.sub_topic_name,
    dst.sub_topic_name,
    3,
    ROW_NUMBER() OVER (PARTITION BY topic.id ORDER BY dst.sub_topic_name)
FROM distinct_subtopics dst
JOIN curriculum_topics module ON 
    module.exam_board_subject_id = dst.exam_board_subject_id
    AND module.topic_name = dst.module_name
    AND module.topic_level = 1
JOIN curriculum_topics topic ON 
    topic.parent_topic_id = module.id
    AND topic.topic_name = dst.topic_name
    AND topic.topic_level = 2;

-- FINAL A-LEVEL CHECK
SELECT 
    'A-LEVEL COMPLETE' as status,
    eb.code as exam_board,
    COUNT(DISTINCT ebs.subject_name) as subjects,
    COUNT(*) as total_topics,
    SUM(CASE WHEN ct.topic_level = 1 THEN 1 ELSE 0 END) as modules,
    SUM(CASE WHEN ct.topic_level = 2 THEN 1 ELSE 0 END) as topics,
    SUM(CASE WHEN ct.topic_level = 3 THEN 1 ELSE 0 END) as sub_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code
ORDER BY eb.code;

-- Expected totals should roughly match your cleaned_topics counts:
-- AQA: ~2,042 rows, CCEA: ~41 rows, EDEXCEL: ~1,352 rows, etc. 