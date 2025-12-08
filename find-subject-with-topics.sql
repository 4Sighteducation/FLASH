-- Find a subject that actually has topics

-- Get subjects with topic counts
SELECT 
  ebs.id as subject_id,
  ebs.subject_name,
  ebs.subject_code,
  eb.code as exam_board,
  COUNT(ct.id) as topic_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
WHERE ebs.is_current = true
GROUP BY ebs.id, ebs.subject_name, ebs.subject_code, eb.code
HAVING COUNT(ct.id) > 0
ORDER BY COUNT(ct.id) DESC
LIMIT 10;

-- Once you find one with topics, use this:
-- Get 5 topics from that subject
SELECT 
  ct.id as topic_id,
  ct.topic_name,
  ct.topic_level
FROM curriculum_topics ct
WHERE ct.exam_board_subject_id = 'USE_SUBJECT_ID_FROM_ABOVE'
  AND ct.topic_level >= 2
LIMIT 5;
