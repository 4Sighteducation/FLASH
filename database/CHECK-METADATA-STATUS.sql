-- ========================================
-- CHECK CURRENT AI METADATA STATUS
-- ========================================
-- Run this in Supabase SQL Editor to see what's actually in the database

-- 1. Overall status
SELECT 
  'Overall Status' as check_type,
  (SELECT COUNT(*) FROM curriculum_topics) as total_topics,
  (SELECT COUNT(*) FROM topic_ai_metadata) as topics_with_metadata,
  (SELECT COUNT(*) FROM topic_ai_metadata WHERE embedding IS NOT NULL) as topics_with_embeddings,
  (SELECT COUNT(*) FROM topic_ai_metadata WHERE plain_english_summary IS NOT NULL) as topics_with_summaries;

-- 2. Breakdown by exam board
SELECT 
  'By Exam Board' as check_type,
  exam_board,
  qualification_level,
  COUNT(*) as topics_with_metadata
FROM topic_ai_metadata
WHERE embedding IS NOT NULL
GROUP BY exam_board, qualification_level
ORDER BY exam_board, qualification_level;

-- 3. Check for topics WITHOUT metadata
SELECT 
  'Missing Metadata' as check_type,
  eb.code as exam_board,
  qt.code as qualification_level,
  COUNT(DISTINCT ct.id) as topics_without_metadata
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE tam.topic_id IS NULL
GROUP BY eb.code, qt.code
ORDER BY COUNT(DISTINCT ct.id) DESC;

-- 4. Sample of existing metadata
SELECT 
  'Sample Metadata' as check_type,
  topic_name,
  plain_english_summary,
  difficulty_band,
  exam_importance,
  created_at
FROM topic_ai_metadata
WHERE embedding IS NOT NULL
  AND plain_english_summary IS NOT NULL
LIMIT 5;
