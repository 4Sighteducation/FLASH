-- Make topic search RPCs resilient to exam_board casing (Edexcel vs EDEXCEL)
-- This avoids needing a massive UPDATE on topic_ai_metadata just to standardize casing.
--
-- Run in Supabase SQL editor.

-- match_topics (SQL function)
CREATE OR REPLACE FUNCTION match_topics(
  query_embedding vector(1536),
  p_exam_board text DEFAULT NULL,
  p_qualification_level text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_match_threshold float DEFAULT 0.0,
  p_limit int DEFAULT 20
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
LANGUAGE sql
STABLE
AS $$
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
    1 - (tam.embedding <=> query_embedding) as similarity
  FROM topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR upper(tam.exam_board) = upper(p_exam_board))
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
    AND (1 - (tam.embedding <=> query_embedding)) >= p_match_threshold
  ORDER BY tam.embedding <=> query_embedding
  LIMIT p_limit;
$$;

-- match_topics_limited (PL/pgSQL function)
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
  FROM public.topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR upper(tam.exam_board) = upper(p_exam_board))
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
  ORDER BY
    tam.embedding <=> query_embedding
  LIMIT LEAST(p_limit, 20);
END;
$$;

-- search_topics_by_text (fallback)
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
  FROM public.topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR upper(tam.exam_board) = upper(p_exam_board))
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
    AND (
      tam.plain_english_summary ILIKE '%' || search_query || '%'
      OR array_to_string(tam.full_path, ' ') ILIKE '%' || search_query || '%'
    )
  ORDER BY
    CASE
      WHEN tam.plain_english_summary ILIKE search_query THEN 0
      WHEN array_to_string(tam.full_path, ' ') ILIKE search_query THEN 1
      ELSE 2
    END,
    tam.topic_level
  LIMIT LEAST(p_limit, 20);
END;
$$;


