-- Step 1: Create temporary import table matching your CSV structure
CREATE TABLE IF NOT EXISTS temp_knack_import (
    id SERIAL PRIMARY KEY,
    exam_board TEXT,
    exam_type TEXT,
    subject TEXT,
    module TEXT,
    topic TEXT,
    sub_topic TEXT,
    -- Add any other columns from your CSV here
    -- If your CSV has the field codes, include them:
    field_3034 TEXT, -- Exam Board
    field_3035 TEXT, -- Exam Type
    field_3033 TEXT, -- Subject
    field_3036 TEXT, -- Module
    field_3037 TEXT, -- Topic
    field_3038 TEXT  -- Sub Topic
);

-- Step 2: After uploading CSV via Supabase UI, run this to check the data
SELECT COUNT(*) as total_rows FROM temp_knack_import;
SELECT * FROM temp_knack_import LIMIT 10;

-- Step 3: Clean up the data (normalize exam boards and types)
UPDATE temp_knack_import 
SET exam_board = UPPER(TRIM(exam_board)),
    exam_type = UPPER(REPLACE(TRIM(exam_type), ' ', '_'));

-- Step 4: Insert unique exam board subjects
INSERT INTO exam_board_subjects (exam_board_id, qualification_type_id, subject_name, subject_code)
SELECT DISTINCT 
    eb.id,
    qt.id,
    TRIM(t.subject),
    COALESCE(t.field_3033, TRIM(t.subject)) -- Use field code or subject name
FROM temp_knack_import t
JOIN exam_boards eb ON eb.code = t.exam_board
JOIN qualification_types qt ON qt.code = t.exam_type
WHERE t.subject IS NOT NULL 
  AND t.subject != ''
ON CONFLICT (exam_board_id, qualification_type_id, subject_code) DO NOTHING;

-- Step 5: Insert modules (Level 1 topics)
WITH modules AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        TRIM(t.module) as module_name,
        COALESCE(t.field_3036, TRIM(t.module)) as module_code
    FROM temp_knack_import t
    JOIN exam_boards eb ON eb.code = t.exam_board
    JOIN qualification_types qt ON qt.code = t.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(t.subject)
    WHERE t.module IS NOT NULL 
      AND t.module != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    module_name,
    module_code,
    1, -- Module level
    ROW_NUMBER() OVER (PARTITION BY exam_board_subject_id ORDER BY module_name)
FROM modules
ON CONFLICT DO NOTHING;

-- Step 6: Insert topics (Level 2)
WITH topics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_id,
        TRIM(t.topic) as topic_name,
        COALESCE(t.field_3037, TRIM(t.topic)) as topic_code
    FROM temp_knack_import t
    JOIN exam_boards eb ON eb.code = t.exam_board
    JOIN qualification_types qt ON qt.code = t.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(t.subject)
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.topic_name = TRIM(t.module)
        AND parent.topic_level = 1
    WHERE t.topic IS NOT NULL 
      AND t.topic != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_id,
    topic_name,
    topic_code,
    2, -- Topic level
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY topic_name)
FROM topics
ON CONFLICT DO NOTHING;

-- Step 7: Insert subtopics (Level 3)
WITH subtopics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_id,
        TRIM(t.sub_topic) as subtopic_name,
        COALESCE(t.field_3038, TRIM(t.sub_topic)) as subtopic_code
    FROM temp_knack_import t
    JOIN exam_boards eb ON eb.code = t.exam_board
    JOIN qualification_types qt ON qt.code = t.exam_type
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(t.subject)
    JOIN curriculum_topics module ON 
        module.exam_board_subject_id = ebs.id 
        AND module.topic_name = TRIM(t.module)
        AND module.topic_level = 1
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.parent_topic_id = module.id
        AND parent.topic_name = TRIM(t.topic)
        AND parent.topic_level = 2
    WHERE t.sub_topic IS NOT NULL 
      AND t.sub_topic != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_id,
    subtopic_name,
    subtopic_code,
    3, -- Subtopic level
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY subtopic_name)
FROM subtopics
ON CONFLICT DO NOTHING;

-- Step 8: Verify the import
SELECT 
    'Imported Subjects' as category,
    COUNT(DISTINCT id) as count 
FROM exam_board_subjects
UNION ALL
SELECT 
    'Level 1 - Modules',
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 1
UNION ALL
SELECT 
    'Level 2 - Topics',
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 2
UNION ALL
SELECT 
    'Level 3 - Subtopics',
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 3;

-- Step 9: Check sample of imported data
SELECT 
    eb.code as exam_board,
    qt.code as qualification,
    ebs.subject_name,
    m.topic_name as module,
    t.topic_name as topic,
    st.topic_name as subtopic
FROM curriculum_topics m
JOIN exam_board_subjects ebs ON m.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics t ON t.parent_topic_id = m.id AND t.topic_level = 2
LEFT JOIN curriculum_topics st ON st.parent_topic_id = t.id AND st.topic_level = 3
WHERE m.topic_level = 1
LIMIT 20;

-- Step 10: Clean up (only run this after verifying the import worked!)
-- DROP TABLE temp_knack_import; 