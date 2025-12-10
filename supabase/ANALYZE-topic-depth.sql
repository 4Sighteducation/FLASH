-- ============================================
-- ANALYZE: How deep do topic hierarchies go?
-- ============================================

-- 1. Distribution of topic levels across entire database
SELECT 
    topic_level,
    COUNT(*) as topic_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
    COUNT(DISTINCT exam_board_subject_id) as subjects_affected
FROM curriculum_topics
GROUP BY topic_level
ORDER BY topic_level;

-- 2. Which subjects have Level 5+ topics?
SELECT 
    ebs.subject_name,
    ebs.exam_board,
    MAX(t.topic_level) as deepest_level,
    COUNT(*) as total_topics,
    COUNT(*) FILTER (WHERE t.topic_level >= 5) as level5_plus_count
FROM curriculum_topics t
JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
GROUP BY ebs.subject_name, ebs.exam_board
HAVING MAX(t.topic_level) >= 5
ORDER BY deepest_level DESC, level5_plus_count DESC
LIMIT 20;

-- 3. Example of deepest hierarchy chain
WITH RECURSIVE topic_chain AS (
    -- Start with deepest topics
    SELECT 
        t.id,
        t.topic_name,
        t.topic_level,
        t.parent_topic_id,
        ebs.subject_name,
        1 as depth,
        t.topic_name::TEXT as chain
    FROM curriculum_topics t
    JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
    WHERE t.topic_level = (SELECT MAX(topic_level) FROM curriculum_topics)
    
    UNION ALL
    
    -- Recursively get parents
    SELECT 
        parent.id,
        parent.topic_name,
        parent.topic_level,
        parent.parent_topic_id,
        tc.subject_name,
        tc.depth + 1,
        parent.topic_name || ' > ' || tc.chain
    FROM curriculum_topics parent
    INNER JOIN topic_chain tc ON parent.id = tc.parent_topic_id
)
SELECT 
    subject_name,
    topic_level,
    chain as full_hierarchy
FROM topic_chain
WHERE parent_topic_id IS NULL  -- Root level
ORDER BY depth DESC
LIMIT 5;

-- 4. For Physical Education specifically
SELECT 
    'Physical Education depth' as analysis,
    topic_level,
    COUNT(*) as count,
    STRING_AGG(topic_name, ' | ') FILTER (WHERE topic_level >= 4) as sample_deep_topics
FROM curriculum_topics t
JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
WHERE ebs.subject_name LIKE '%Physical Education%'
GROUP BY topic_level
ORDER BY topic_level;

-- 5. Sample Level 4+ topics from PE to see the pattern
SELECT 
    t.topic_level,
    t.topic_name,
    parent.topic_name as level3_parent,
    grandparent.topic_name as level2_grandparent,
    great_grandparent.topic_name as level1_great_grandparent
FROM curriculum_topics t
LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN curriculum_topics great_grandparent ON great_grandparent.id = grandparent.parent_topic_id
JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
WHERE ebs.subject_name LIKE '%Physical Education%'
  AND t.topic_level >= 4
ORDER BY t.topic_level, t.topic_name
LIMIT 10;

