-- ============================================
-- DEBUG: Physical Education hierarchy for current user
-- ============================================

-- Get the hierarchy data for PE user
SELECT 
    topic_id,
    topic_name,
    topic_level,
    parent_name,
    grandparent_name,
    great_grandparent_name,
    card_count
FROM get_user_topics_with_hierarchy(
    'e62a75ef-e199-4ecc-9ad1-54a9d1369418', -- Current PE user
    'Physical Education (A-Level)'
);

-- Also check what the raw topic structure looks like
SELECT 
    t.id,
    t.topic_name,
    t.topic_level,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    great_grandparent.topic_name as great_grandparent_name
FROM flashcards f
JOIN curriculum_topics t ON t.id = f.topic_id
LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN curriculum_topics great_grandparent ON great_grandparent.id = grandparent.parent_topic_id
WHERE f.user_id = 'e62a75ef-e199-4ecc-9ad1-54a9d1369418'
GROUP BY t.id, t.topic_name, t.topic_level, parent.topic_name, grandparent.topic_name, great_grandparent.topic_name
ORDER BY t.topic_level;


