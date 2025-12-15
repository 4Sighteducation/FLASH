-- Function: Get Smart Topic Suggestions
-- Purpose: Return 4 most relevant topic suggestions for a subject based on importance and popularity
-- Used by: SmartTopicDiscoveryScreen for "Try searching for" suggestions

CREATE OR REPLACE FUNCTION get_smart_topic_suggestions(
  p_subject_name TEXT,
  p_qualification_level TEXT,
  p_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  topic_name TEXT,
  exam_importance NUMERIC,
  flashcard_count BIGINT,
  smart_score NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strategy: Combine exam importance (70%) with user popularity (30%)
  -- Falls back to pure importance if no flashcards exist yet
  
  RETURN QUERY
  SELECT 
    ct.topic_name,
    ct.exam_importance,
    COUNT(DISTINCT f.id)::BIGINT as flashcard_count,
    ROUND(
      (
        ct.exam_importance * 0.7 + 
        COALESCE(
          (COUNT(DISTINCT f.id)::NUMERIC / NULLIF(
            (SELECT MAX(card_count) FROM (
              SELECT COUNT(*)::NUMERIC as card_count 
              FROM flashcards 
              WHERE topic_id IN (
                SELECT topic_id FROM curriculum_topics 
                WHERE subject_name = p_subject_name
              )
              GROUP BY topic_id
            ) sub), 0
          )) * 0.3,
          0  -- If no cards exist, this becomes 0
        )
      )::NUMERIC, 4
    ) as smart_score
  FROM curriculum_topics ct
  LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
  WHERE ct.subject_name = p_subject_name
    AND ct.qualification_level = p_qualification_level
    AND ct.topic_level >= 3  -- Specific enough
    AND ct.topic_level <= 4  -- Not too deep
    AND ct.exam_importance > 0  -- Only important topics
    AND ct.topic_name IS NOT NULL
    AND LENGTH(ct.topic_name) > 0
  GROUP BY ct.topic_id, ct.topic_name, ct.exam_importance
  ORDER BY smart_score DESC
  LIMIT p_limit;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO anon;

-- Test the function
-- SELECT * FROM get_smart_topic_suggestions('Biology', 'GCSE', 4);
