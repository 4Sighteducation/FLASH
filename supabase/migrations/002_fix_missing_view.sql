-- ========================================
-- FIX: Create missing view for incremental processing
-- ========================================

-- Create the view that the script expects
CREATE OR REPLACE VIEW get_topics_needing_metadata AS
SELECT 
  ct.id as topic_id,
  ct.topic_name,
  ct.topic_code,
  ct.topic_level,
  eb.code as exam_board,
  qt.code as qualification_level,
  ebs.subject_name
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE tam.topic_id IS NULL;

-- Verify it works
SELECT COUNT(*) as topics_needing_metadata 
FROM get_topics_needing_metadata;
