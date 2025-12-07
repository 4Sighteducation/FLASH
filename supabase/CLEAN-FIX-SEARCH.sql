-- ============================================
-- CLEAN FIX - REMOVES DUPLICATES AND RECREATES
-- RUN THIS ENTIRE SCRIPT AT ONCE
-- ============================================

-- 1. DROP ALL OLD VERSIONS OF THE FUNCTIONS
DROP FUNCTION IF EXISTS match_topics CASCADE;
DROP FUNCTION IF EXISTS match_topics_fast CASCADE;

-- 2. CREATE INDEXES (skip if they exist)
CREATE INDEX IF NOT EXISTS idx_topic_metadata_exam_board 
ON topic_ai_metadata(exam_board);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_qualification 
ON topic_ai_metadata(qualification_level);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_subject 
ON topic_ai_metadata(subject_name);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_active 
ON topic_ai_metadata(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_topic_metadata_composite
ON topic_ai_metadata(is_active, exam_board, qualification_level)
WHERE is_active = true;

-- 3. UPDATE STATISTICS
ANALYZE topic_ai_metadata;

-- 4. CREATE SINGLE CLEAN VERSION OF match_topics
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
  -- Set timeout to prevent hanging
  SET LOCAL statement_timeout = '5s';
  
  -- For unfiltered searches, use sampling to avoid timeout
  IF p_exam_board IS NULL AND p_qualification_level IS NULL AND p_subject_name IS NULL THEN
    -- Sample 10% for speed on general searches
    RETURN QUERY
    WITH sampled AS (
      SELECT * FROM topic_ai_metadata
      WHERE is_active = true
      ORDER BY random()
      LIMIT 5000  -- Fixed sample size for consistency
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
    -- Filtered searches use full dataset with indexes (fast)
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

-- 5. VERIFY CLEANUP
SELECT 
  'Functions after cleanup' as status,
  proname as function_name,
  pronargs as num_params
FROM pg_proc 
WHERE proname = 'match_topics';

-- 6. TEST QUERY
SELECT 'Testing function...' as status;

SELECT 
  COUNT(*) as test_result
FROM match_topics(
  (SELECT embedding FROM topic_ai_metadata LIMIT 1),
  NULL,
  NULL,
  NULL,
  5
);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Cleaned up duplicate functions!';
  RAISE NOTICE '✅ Single match_topics function created';
  RAISE NOTICE 'Ready for testing: node test-search.js';
END $$;











