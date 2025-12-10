-- ============================================
-- ANALYZE: How to rebuild hierarchy without full_path
-- ============================================

-- 1. What's in user_topics_with_progress view?
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_topics_with_progress'
ORDER BY ordinal_position;

-- 2. What info do we have in curriculum_topics for building hierarchy?
SELECT 
    id,
    topic_name,
    topic_level,
    parent_topic_id,
    sort_order
FROM curriculum_topics
WHERE exam_board_subject_id IN (
    SELECT id FROM exam_board_subjects 
    WHERE subject_name LIKE '%Physical Education%'
    LIMIT 1
)
ORDER BY topic_level, sort_order
LIMIT 20;

-- 3. Sample: Can we trace a topic's full path using parent_topic_id?
WITH RECURSIVE topic_path AS (
    -- Start with a specific topic
    SELECT 
        id,
        topic_name,
        topic_level,
        parent_topic_id,
        topic_name as path_names,
        1 as depth
    FROM curriculum_topics
    WHERE id = '775d21ca-ac74-4169-894e-7043b50721b7' -- Names of Muscles topic
    
    UNION ALL
    
    -- Recursively get parent
    SELECT 
        t.id,
        t.topic_name,
        t.topic_level,
        t.parent_topic_id,
        t.topic_name || ' > ' || tp.path_names,
        tp.depth + 1
    FROM curriculum_topics t
    INNER JOIN topic_path tp ON t.id = tp.parent_topic_id
)
SELECT * FROM topic_path ORDER BY depth DESC;

-- 4. SOLUTION: Enhanced query that includes parent info
SELECT 
    t.id as topic_id,
    t.topic_name,
    t.topic_level,
    t.parent_topic_id,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    COUNT(f.id) as card_count,
    COUNT(f.id) FILTER (WHERE f.box_number >= 4) as cards_mastered
FROM curriculum_topics t
LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN flashcards f ON f.topic_id = t.id 
WHERE t.id IN (
    SELECT DISTINCT topic_id 
    FROM flashcards 
    WHERE user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513' -- Replace with actual user_id
)
GROUP BY t.id, t.topic_name, t.topic_level, t.parent_topic_id, parent.topic_name, grandparent.topic_name;

