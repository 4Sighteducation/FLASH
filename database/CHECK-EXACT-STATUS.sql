-- ========================================
-- CHECK EXACT DATABASE STATUS
-- ========================================
-- Run this in Supabase SQL Editor to see the truth!

-- 1. How many topics have metadata?
SELECT 
  'Current Status' as check,
  COUNT(*) as topics_with_metadata
FROM topic_ai_metadata;

-- 2. What are the actual columns in the table?
SELECT 
  'Table Columns' as check,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'topic_ai_metadata'
ORDER BY ordinal_position;

-- 3. Sample of what's actually saved
SELECT 
  'Sample Data' as check,
  topic_id,
  topic_name,
  exam_board,
  qualification_level,
  subject_name,
  difficulty_band,
  LENGTH(embedding::text) as embedding_size,
  LEFT(plain_english_summary, 50) as summary_preview
FROM topic_ai_metadata
LIMIT 5;

-- 4. Which exam boards have data?
SELECT 
  'Data by Board' as check,
  exam_board,
  qualification_level,
  COUNT(*) as topic_count
FROM topic_ai_metadata
GROUP BY exam_board, qualification_level
ORDER BY exam_board, qualification_level;

-- 5. Total topics that need metadata
SELECT 
  'Total Topics' as check,
  COUNT(*) as total_curriculum_topics
FROM curriculum_topics;

-- 6. Calculate what's missing
WITH counts AS (
  SELECT 
    (SELECT COUNT(*) FROM curriculum_topics) as total_topics,
    (SELECT COUNT(*) FROM topic_ai_metadata) as with_metadata
)
SELECT 
  'Summary' as check,
  total_topics,
  with_metadata,
  total_topics - with_metadata as still_needed,
  ROUND((with_metadata::numeric / total_topics) * 100, 1) as percent_complete
FROM counts;


