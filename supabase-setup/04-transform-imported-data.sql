-- Step 1: Clean up the imported data (standardize exam boards and types)
UPDATE "Imported Knack" 
SET 
    "Exam Board" = UPPER(TRIM("Exam Board")),
    "Exam Type" = UPPER(REPLACE(TRIM("Exam Type"), ' ', '_'));

-- Step 2: Check what exam boards and types we have
SELECT DISTINCT "Exam Board", COUNT(*) 
FROM "Imported Knack" 
GROUP BY "Exam Board";

SELECT DISTINCT "Exam Type", COUNT(*) 
FROM "Imported Knack" 
GROUP BY "Exam Type";

-- Step 3: Insert unique exam board subjects
INSERT INTO exam_board_subjects (exam_board_id, qualification_type_id, subject_name, subject_code)
SELECT DISTINCT 
    eb.id,
    qt.id,
    TRIM(ik."Subject"),
    TRIM(ik."Subject") -- Using subject name as code for now
FROM "Imported Knack" ik
JOIN exam_boards eb ON eb.code = ik."Exam Board"
JOIN qualification_types qt ON qt.code = ik."Exam Type"
WHERE ik."Subject" IS NOT NULL 
  AND ik."Subject" != ''
ON CONFLICT (exam_board_id, qualification_type_id, subject_code) DO NOTHING;

-- Step 4: Insert modules (Level 1 topics)
WITH modules AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        TRIM(ik."Module") as module_name
    FROM "Imported Knack" ik
    JOIN exam_boards eb ON eb.code = ik."Exam Board"
    JOIN qualification_types qt ON qt.code = ik."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(ik."Subject")
    WHERE ik."Module" IS NOT NULL 
      AND ik."Module" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    module_name,
    module_name, -- Using name as code for now
    1, -- Module level
    ROW_NUMBER() OVER (PARTITION BY exam_board_subject_id ORDER BY module_name)
FROM modules;

-- Step 5: Insert topics (Level 2)
WITH topics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_id,
        TRIM(ik."Topic") as topic_name
    FROM "Imported Knack" ik
    JOIN exam_boards eb ON eb.code = ik."Exam Board"
    JOIN qualification_types qt ON qt.code = ik."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(ik."Subject")
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.topic_name = TRIM(ik."Module")
        AND parent.topic_level = 1
    WHERE ik."Topic" IS NOT NULL 
      AND ik."Topic" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_id,
    topic_name,
    topic_name, -- Using name as code
    2, -- Topic level
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY topic_name)
FROM topics;

-- Step 6: Insert subtopics (Level 3)
WITH subtopics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_id,
        TRIM(ik."Sub Topic") as subtopic_name
    FROM "Imported Knack" ik
    JOIN exam_boards eb ON eb.code = ik."Exam Board"
    JOIN qualification_types qt ON qt.code = ik."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = TRIM(ik."Subject")
    JOIN curriculum_topics module ON 
        module.exam_board_subject_id = ebs.id 
        AND module.topic_name = TRIM(ik."Module")
        AND module.topic_level = 1
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.parent_topic_id = module.id
        AND parent.topic_name = TRIM(ik."Topic")
        AND parent.topic_level = 2
    WHERE ik."Sub Topic" IS NOT NULL 
      AND ik."Sub Topic" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_id,
    subtopic_name,
    subtopic_name, -- Using name as code
    3, -- Subtopic level
    ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY subtopic_name)
FROM subtopics;

-- Step 7: Verify the import
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

-- Step 8: See a sample of the hierarchy
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
ORDER BY eb.code, qt.code, ebs.subject_name, m.topic_name, t.topic_name, st.topic_name
LIMIT 20; 