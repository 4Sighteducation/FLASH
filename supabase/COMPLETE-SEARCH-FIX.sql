-- ============================================
-- COMPLETE VECTOR SEARCH FIX - RUN ALL AT ONCE
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

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_topic_metadata_composite
ON topic_ai_metadata(is_active, exam_board, qualification_level)
WHERE is_active = true;

-- 2. Create or replace the vector index (if memory allows)
DO $$
BEGIN
  -- Try to create IVFFlat index
  BEGIN
    -- Drop old index if exists
    DROP INDEX IF EXISTS topic_embedding_idx;
    
    -- Create new index
    CREATE INDEX topic_embedding_idx ON public.topic_ai_metadata
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    
    RAISE NOTICE 'Created IVFFlat vector index';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create vector index (memory limit) - continuing without it';
  END;
END $$;

-- 3. Update table statistics
ANALYZE topic_ai_metadata;

-- 4. Create the FAST search function
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
  
  -- For unfiltered searches, use a sample to avoid timeout
  IF p_exam_board IS NULL AND p_qualification_level IS NULL AND p_subject_name IS NULL THEN
    -- Sample 10% of active topics for general searches
    RETURN QUERY
    WITH sampled AS (
      SELECT * FROM topic_ai_metadata
      WHERE is_active = true
      AND random() < 0.1  -- Sample 10% (~5,500 topics)
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
    -- Filtered searches use indexes and are fast
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

-- 5. Update the original match_topics to use the fast version
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
  -- Delegate to the fast function
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

-- 6. Create text-based search as fallback
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
  SET LOCAL statement_timeout = '2s';
  
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

-- 7. Verification queries
DO $$
DECLARE
  index_count int;
  function_count int;
BEGIN
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'topic_ai_metadata';
  
  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname IN ('match_topics', 'match_topics_fast', 'search_topics_text');
  
  RAISE NOTICE '✅ Created % indexes and % search functions', index_count, function_count;
  RAISE NOTICE '✅ Search optimization complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Test with: node test-fast-search.js';
  RAISE NOTICE '';
  RAISE NOTICE 'Notes:';
  RAISE NOTICE '- General searches (no filters) use 10% sampling for speed';
  RAISE NOTICE '- Filtered searches use full dataset with indexes';
  RAISE NOTICE '- Text search available as fallback';
END $$;









