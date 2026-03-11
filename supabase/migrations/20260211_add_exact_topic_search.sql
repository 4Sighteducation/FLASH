-- Add Exact (lexical) topic search RPC.
-- Purpose: provide a fast, non-OpenAI "Exact" mode matching only on topic name/path.
-- Notes:
-- - Uses topic_ai_metadata for course filtering + full_path breadcrumbs.
-- - Joins curriculum_topics for canonical topic_name.

CREATE OR REPLACE FUNCTION public.search_topics_exact_path(
  search_query text,
  p_exam_board text DEFAULT NULL,
  p_qualification_level text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  topic_id uuid,
  topic_name text,
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
STABLE
AS $$
DECLARE
  q text := lower(trim(coalesce(search_query, '')));
BEGIN
  IF q = '' OR length(q) < 2 THEN
    RETURN;
  END IF;

  -- Keep this cheap and predictable.
  SET LOCAL statement_timeout = '5s';

  RETURN QUERY
  WITH cte AS (
    SELECT
      tam.topic_id,
      ct.topic_name,
      tam.plain_english_summary,
      tam.difficulty_band,
      tam.exam_importance,
      tam.subject_name,
      tam.exam_board,
      tam.qualification_level,
      tam.topic_level,
      tam.full_path,
      lower(array_to_string(tam.full_path, ' ')) AS full_path_str,
      lower(coalesce(tam.full_path[array_length(tam.full_path, 1)], ct.topic_name, '')) AS last_segment
    FROM public.topic_ai_metadata tam
    JOIN public.curriculum_topics ct ON ct.id = tam.topic_id
    WHERE
      tam.is_active = true
      AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
      AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
      AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
  )
  SELECT
    topic_id,
    topic_name,
    plain_english_summary,
    difficulty_band,
    exam_importance,
    subject_name,
    exam_board,
    qualification_level,
    topic_level,
    full_path
  FROM cte
  WHERE
    -- EXACT MODE: match only on name/path (full_path contains the leaf topic name)
    cte.full_path_str ILIKE '%' || q || '%'
  ORDER BY
    -- Best: leaf name equals query
    CASE WHEN cte.last_segment = q THEN 0 ELSE 1 END,
    -- Next: whole-word-ish match in path string
    CASE
      WHEN cte.full_path_str ~ ('(^|\\s)' || regexp_replace(q, '[^a-z0-9\\s]', '', 'g') || '(\\s|$)') THEN 0
      ELSE 1
    END,
    -- Shorter matches tend to be more "exact"
    length(cte.full_path_str) ASC,
    -- Prefer more specific topics when tied
    cte.topic_level DESC NULLS LAST
  LIMIT LEAST(p_limit, 50);
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_topics_exact_path(text, text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_topics_exact_path(text, text, text, text, int) TO anon;

