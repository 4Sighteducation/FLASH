-- ============================================
-- SIMPLIFIED FIX FOR VECTOR SEARCH
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. Add missing indexes for filtering (CRITICAL!)
CREATE INDEX IF NOT EXISTS idx_topic_metadata_exam_board 
ON topic_ai_metadata(exam_board);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_qualification 
ON topic_ai_metadata(qualification_level);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_subject 
ON topic_ai_metadata(subject_name);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_active 
ON topic_ai_metadata(is_active) WHERE is_active = true;

-- 2. Update statistics
ANALYZE topic_ai_metadata;

-- 3. Create the FAST search function
CREATE OR REPLACE FUNCTION match_topics_fast(
  query_embedding vector(1536),
  p_exam_board text DEFAULT NULL,
  p_qualification_level text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  topic_id uuid,
  plain_english_summary text,
  difficulty_band text,
  exam_importance float,
  subject_name text,
  exam_board text,
  qualification_level text,
  topic_level int,
  full_path text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set timeout to prevent hanging
  SET LOCAL statement_timeout = '5s';
  
  -- Return results
  RETURN QUERY
  SELECT
    tam.topic_id,
    tam.plain_english_summary,
    tam.difficulty_band,
    tam.exam_importance,
    tam.subject_name,
    tam.exam_board,
    tam.qualification_level,
    tam.topic_level,
    tam.full_path,
    (tam.embedding <=> query_embedding) AS similarity
  FROM
    topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
  ORDER BY
    tam.embedding <=> query_embedding
  LIMIT LEAST(p_limit, 20);
END;
$$;

-- 4. Verify function was created
SELECT 
  proname as function_name,
  pronargs as num_arguments
FROM pg_proc 
WHERE proname = 'match_topics_fast';

-- 5. Verify indexes were created
SELECT 
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata'
ORDER BY indexname;

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Search function and indexes created!';
  RAISE NOTICE 'Now run: node test-fast-search.js';
END $$;









