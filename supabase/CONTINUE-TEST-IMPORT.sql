-- CONTINUE TEST IMPORT - Properly handling hierarchy
-- This handles the Module → Topic → Sub Topic structure

-- First, let's see what we're dealing with for AQA A-Level Mathematics
SELECT 
    'AQA A-Level Maths structure' as analysis,
    COUNT(DISTINCT module_name) as unique_modules,
    COUNT(DISTINCT topic_name) as unique_topics,
    COUNT(DISTINCT sub_topic_name) as unique_subtopics,
    COUNT(*) as total_rows
FROM cleaned_topics
WHERE exam_board = 'AQA' 
  AND exam_type = 'A_LEVEL'
  AND subject_name = 'Mathematics (A-Level)';

-- Let's see a sample of the hierarchy
SELECT DISTINCT
    module_name,
    topic_name,
    sub_topic_name
FROM cleaned_topics
WHERE exam_board = 'AQA' 
  AND exam_type = 'A_LEVEL'
  AND subject_name = 'Mathematics (A-Level)'
  AND module_name = 'Algebra and functions'
LIMIT 10;

-- ==============================================
-- FIX: Clear the duplicates and reimport modules correctly
-- ==============================================

-- Clear the test data
DELETE FROM curriculum_topics 
WHERE exam_board_subject_id IN (
    SELECT ebs.id
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    WHERE eb.code = 'AQA' 
      AND ebs.subject_name = 'Mathematics (A-Level)'
);

-- CORRECT MODULE IMPORT - Using DISTINCT
WITH target_subject AS (
    SELECT ebs.id
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE eb.code = 'AQA' 
      AND qt.code = 'A_LEVEL'
      AND ebs.subject_name = 'Mathematics (A-Level)'
),
distinct_modules AS (
    SELECT DISTINCT module_name
    FROM cleaned_topics
    WHERE exam_board = 'AQA' 
      AND exam_type = 'A_LEVEL'
      AND subject_name = 'Mathematics (A-Level)'
      AND module_name IS NOT NULL 
      AND module_name != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    ts.id,
    dm.module_name,
    dm.module_name,
    1,
    ROW_NUMBER() OVER (ORDER BY dm.module_name)
FROM distinct_modules dm
CROSS JOIN target_subject ts;

-- Check: Should now see unique modules only
SELECT 
    'Unique AQA Maths Modules' as what,
    ct.topic_name as module_name,
    ct.id as module_id
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name = 'Mathematics (A-Level)'
  AND ct.topic_level = 1
ORDER BY ct.topic_name;

-- ==============================================
-- Now import TOPICS (Level 2) under each module
-- ==============================================

WITH target_data AS (
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
    WHERE ct.exam_board = 'AQA' 
      AND ct.exam_type = 'A_LEVEL'
      AND ct.subject_name = 'Mathematics (A-Level)'
      AND ct.topic_name IS NOT NULL 
      AND ct.topic_name != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    td.exam_board_subject_id,
    parent.id,
    td.topic_name,
    td.topic_name,
    2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY td.topic_name)
FROM target_data td
JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = td.exam_board_subject_id
    AND parent.topic_name = td.module_name
    AND parent.topic_level = 1;

-- Check topic count
SELECT 
    'Topics under Algebra and functions' as check,
    COUNT(*) as topic_count
FROM curriculum_topics ct
JOIN curriculum_topics parent ON ct.parent_topic_id = parent.id
WHERE parent.topic_name = 'Algebra and functions'
  AND ct.topic_level = 2;

-- ==============================================
-- Finally, import SUB TOPICS (Level 3) under each topic
-- ==============================================

WITH target_data AS (
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
    WHERE ct.exam_board = 'AQA' 
      AND ct.exam_type = 'A_LEVEL'
      AND ct.subject_name = 'Mathematics (A-Level)'
      AND ct.sub_topic_name IS NOT NULL 
      AND ct.sub_topic_name != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    module.exam_board_subject_id,
    topic.id,
    td.sub_topic_name,
    td.sub_topic_name,
    3,
    ROW_NUMBER() OVER (PARTITION BY topic.id ORDER BY td.sub_topic_name)
FROM target_data td
JOIN curriculum_topics module ON 
    module.exam_board_subject_id = td.exam_board_subject_id
    AND module.topic_name = td.module_name
    AND module.topic_level = 1
JOIN curriculum_topics topic ON 
    topic.parent_topic_id = module.id
    AND topic.topic_name = td.topic_name
    AND topic.topic_level = 2;

-- FINAL CHECK: Complete hierarchy for AQA A-Level Mathematics
SELECT 
    'AQA A-Level Mathematics Complete Import' as status,
    topic_level,
    COUNT(*) as count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name = 'Mathematics (A-Level)'
GROUP BY topic_level
ORDER BY topic_level;

-- Expected: Reasonable numbers at each level, no massive duplication 