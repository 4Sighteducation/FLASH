-- ============================================
-- SECTION 1: RUN THIS FIRST - INDEXES
-- ============================================
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

ANALYZE topic_ai_metadata;

SELECT 'Section 1 Complete: Indexes created' as status;

-- ============================================
-- SECTION 2: RUN THIS SECOND - FAST FUNCTION
-- ============================================
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
  SET LOCAL statement_timeout = '5s';
  
  IF p_exam_board IS NULL AND p_qualification_level IS NULL AND p_subject_name IS NULL THEN
    -- Sample for general searches
    RETURN QUERY
    WITH sampled AS (
      SELECT * FROM topic_ai_metadata
      WHERE is_active = true
      AND random() < 0.1
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
    -- Full search with filters
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

SELECT 'Section 2 Complete: match_topics_fast created' as status;

-- ============================================
-- SECTION 3: RUN THIS THIRD - UPDATE ORIGINAL
-- ============================================
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

SELECT 'Section 3 Complete: match_topics updated' as status;

-- ============================================
-- SECTION 4: RUN THIS FOURTH - VERIFICATION
-- ============================================
SELECT 
  'Functions created' as check_type,
  COUNT(*) as count
FROM pg_proc 
WHERE proname IN ('match_topics', 'match_topics_fast');

SELECT 
  'Indexes created' as check_type,
  COUNT(*) as count
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata';









