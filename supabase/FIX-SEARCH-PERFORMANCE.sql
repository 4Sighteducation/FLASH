-- ============================================
-- COMPLETE FIX FOR VECTOR SEARCH PERFORMANCE
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- 1. Add missing indexes for filtering (crucial!)
CREATE INDEX IF NOT EXISTS idx_topic_metadata_exam_board 
ON topic_ai_metadata(exam_board);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_qualification 
ON topic_ai_metadata(qualification_level);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_subject 
ON topic_ai_metadata(subject_name);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_active 
ON topic_ai_metadata(is_active) WHERE is_active = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_topic_metadata_composite
ON topic_ai_metadata(is_active, exam_board, qualification_level)
WHERE is_active = true;

-- 2. Create IVFFlat index if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'topic_ai_metadata' 
    AND indexname = 'topic_embedding_idx'
  ) THEN
    CREATE INDEX topic_embedding_idx ON public.topic_ai_metadata
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    RAISE NOTICE 'Created vector index';
  ELSE
    RAISE NOTICE 'Vector index already exists';
  END IF;
END $$;

-- 3. Update table statistics
ANALYZE topic_ai_metadata;

-- 4. Create optimized search function
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
DECLARE
  result_count int;
BEGIN
  -- Configure for speed
  SET LOCAL ivfflat.probes = 5; -- Balance between speed and accuracy
  SET LOCAL statement_timeout = '3s';
  SET LOCAL work_mem = '256MB'; -- Use more memory for this query
  
  -- For unfiltered searches, use sampling approach
  IF p_exam_board IS NULL AND p_qualification_level IS NULL AND p_subject_name IS NULL THEN
    -- Sample approach for general searches
    RETURN QUERY
    WITH sampled AS (
      SELECT * FROM topic_ai_metadata
      WHERE is_active = true
      TABLESAMPLE SYSTEM (20) -- Sample 20% of rows for speed
    )
    SELECT
      s.topic_id,
      s.plain_english_summary,
      s.difficulty_band,
      s.exam_importance,
      s.subject_name,
      s.exam_board,
      s.qualification_level,
      s.topic_level,
      s.full_path,
      (s.embedding <=> query_embedding) AS similarity
    FROM sampled s
    ORDER BY s.embedding <=> query_embedding
    LIMIT p_limit;
  ELSE
    -- Full search with filters (faster due to indexes)
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
    LIMIT p_limit;
  END IF;
END;
$$;

-- 5. Also update the original function with better settings
CREATE OR REPLACE FUNCTION match_topics(
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
  -- Use the fast function
  RETURN QUERY
  SELECT * FROM match_topics_fast(
    query_embedding,
    p_exam_board,
    p_qualification_level,
    p_subject_name,
    p_limit
  );
END;
$$;

-- 6. Create text-based fallback search
CREATE OR REPLACE FUNCTION search_topics_text(
  search_query text,
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
  full_path text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
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
    tam.full_path
  FROM
    topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
    AND (
      tam.plain_english_summary ILIKE '%' || search_query || '%'
      OR array_to_string(tam.full_path, ' ') ILIKE '%' || search_query || '%'
    )
  ORDER BY
    -- Exact matches first
    CASE 
      WHEN lower(tam.plain_english_summary) = lower(search_query) THEN 0
      WHEN lower(array_to_string(tam.full_path, ' ')) = lower(search_query) THEN 1
      ELSE 2
    END,
    tam.topic_level
  LIMIT p_limit;
END;
$$;

-- 7. Verify everything was created
SELECT 
  'Indexes' as check_type,
  count(*) as count
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata'
UNION ALL
SELECT 
  'Functions' as check_type,
  count(*) as count
FROM pg_proc 
WHERE proname IN ('match_topics', 'match_topics_fast', 'search_topics_text');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Search performance fixes applied!';
  RAISE NOTICE 'Test with: node test-fast-search.js';
END $$;









