-- Test the hierarchy query with your actual data
-- Replace user_id with your test user

SELECT * FROM get_user_topics_with_hierarchy(
  'a030e9a6-645f-4fb0-af6f-b1b955fb4513', -- Your test user from logs
  'Chemistry (A-Level)'
);

-- Also check what the raw data looks like
SELECT 
    t.id,
    t.topic_name,
    t.display_name,
    t.topic_level,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    COUNT(f.id) as card_count
FROM curriculum_topics t
LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
LEFT JOIN flashcards f ON f.topic_id = t.id AND f.user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
WHERE ebs.subject_name = 'Chemistry (A-Level)'
  AND EXISTS (
    SELECT 1 FROM flashcards 
    WHERE topic_id = t.id 
    AND user_id = 'a030e9a6-645f-4fb0-af6f-b1b955fb4513'
  )
GROUP BY t.id, t.topic_name, t.display_name, t.topic_level, parent.topic_name, grandparent.topic_name
ORDER BY t.topic_level;

