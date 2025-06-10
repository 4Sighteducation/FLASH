-- STEP 4: POPULATE CURRICULUM_TOPICS
-- This creates the hierarchical topic structure

-- 4.1 Insert Level 1 topics (Modules)
WITH modules AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        ti."Module" as module_name,
        ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ti."Module") as sort_order
    FROM topics_import_temp ti
    JOIN exam_boards eb ON eb.code = ti."Exam Board"
    JOIN qualification_types qt ON qt.code = ti."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ti."Subject"
    WHERE ti."Module" IS NOT NULL 
      AND ti."Module" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    module_name,
    module_name, -- Using name as code
    1, -- Module level
    sort_order
FROM modules;

-- 4.2 Insert Level 2 topics (Topics)
WITH topics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_topic_id,
        ti."Topic" as topic_name,
        ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ti."Topic") as sort_order
    FROM topics_import_temp ti
    JOIN exam_boards eb ON eb.code = ti."Exam Board"
    JOIN qualification_types qt ON qt.code = ti."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ti."Subject"
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.topic_name = ti."Module"
        AND parent.topic_level = 1
    WHERE ti."Topic" IS NOT NULL 
      AND ti."Topic" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_topic_id,
    topic_name,
    topic_name, -- Using name as code
    2, -- Topic level
    sort_order
FROM topics;

-- 4.3 Insert Level 3 topics (Sub Topics)
WITH subtopics AS (
    SELECT DISTINCT
        ebs.id as exam_board_subject_id,
        parent.id as parent_topic_id,
        ti."Sub Topic" as subtopic_name,
        ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY ti."Sub Topic") as sort_order
    FROM topics_import_temp ti
    JOIN exam_boards eb ON eb.code = ti."Exam Board"
    JOIN qualification_types qt ON qt.code = ti."Exam Type"
    JOIN exam_board_subjects ebs ON 
        ebs.exam_board_id = eb.id 
        AND ebs.qualification_type_id = qt.id 
        AND ebs.subject_name = ti."Subject"
    JOIN curriculum_topics module ON 
        module.exam_board_subject_id = ebs.id 
        AND module.topic_name = ti."Module"
        AND module.topic_level = 1
    JOIN curriculum_topics parent ON 
        parent.exam_board_subject_id = ebs.id 
        AND parent.parent_topic_id = module.id
        AND parent.topic_name = ti."Topic"
        AND parent.topic_level = 2
    WHERE ti."Sub Topic" IS NOT NULL 
      AND ti."Sub Topic" != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT 
    exam_board_subject_id,
    parent_topic_id,
    subtopic_name,
    subtopic_name, -- Using name as code
    3, -- Subtopic level
    sort_order
FROM subtopics;

-- 4.4 Verify the import
SELECT 
    'Total topics imported' as description,
    COUNT(*) as count
FROM curriculum_topics
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
    'Level 3 - Sub Topics',
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 3; 