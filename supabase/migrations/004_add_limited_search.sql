-- Create a simpler search function with built-in limits to prevent timeouts
CREATE OR REPLACE FUNCTION match_topics_limited(
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
  -- Set a reasonable statement timeout for this function
  SET LOCAL statement_timeout = '10s';
  
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
    public.topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
  ORDER BY
    tam.embedding <=> query_embedding
  LIMIT LEAST(p_limit, 20); -- Hard cap at 20 results
END;
$$;

-- Create a text-based search as fallback
CREATE OR REPLACE FUNCTION search_topics_by_text(
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
    public.topic_ai_metadata tam
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
    -- Prioritize exact matches
    CASE 
      WHEN tam.plain_english_summary ILIKE search_query THEN 0
      WHEN array_to_string(tam.full_path, ' ') ILIKE search_query THEN 1
      ELSE 2
    END,
    -- Then by topic level (higher level topics first)
    tam.topic_level
  LIMIT LEAST(p_limit, 20);
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Added limited search functions to prevent timeouts!';
END $$;











