-- First, check if exam_board_subjects is empty
SELECT COUNT(*) as exam_board_subjects_count FROM exam_board_subjects;

-- Check what exam_board_subject_ids exist in curriculum_topics
SELECT DISTINCT exam_board_subject_id, COUNT(*) as topic_count
FROM curriculum_topics
WHERE exam_board_subject_id IS NOT NULL
GROUP BY exam_board_subject_id
ORDER BY topic_count DESC
LIMIT 10;

-- If exam_board_subjects is empty, we need to populate it
-- First, let's see what unique combinations we can extract from curriculum_topics
-- This query will show us what data structure we're working with
SELECT 
    ct.exam_board_subject_id,
    ct.topic_name,
    ct.topic_level,
    ct.parent_topic_id
FROM curriculum_topics ct
WHERE ct.topic_level = 1  -- Top level topics only
LIMIT 20;

-- Check if there's a pattern we can use to reconstruct the exam_board_subjects
-- Let's look for any metadata or relationships
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'curriculum_topics'
ORDER BY ordinal_position; 