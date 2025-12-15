-- Function: Get Smart Topic Suggestions
-- Purpose: Return 4 most relevant topics using exam_importance + user popularity
-- Used by: SmartTopicDiscoveryScreen for "Try searching for" suggestions

-- Drop old version if exists
DROP FUNCTION IF EXISTS get_smart_topic_suggestions(text, text, integer);

CREATE OR REPLACE FUNCTION get_smart_topic_suggestions(
  p_subject_name TEXT,
  p_qualification_level TEXT,
  p_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  topic_name TEXT,
  exam_importance DOUBLE PRECISION,
  flashcard_count BIGINT,
  smart_score NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strategy: 70% exam_importance + 30% user popularity
  -- Uses topic_ai_metadata which has all the metadata in one place
  
  RETURN QUERY
  WITH subject_topics AS (
    SELECT 
      ai.topic_id,
      ct.topic_name,
      ai.topic_level,
      ai.exam_importance,
      COUNT(DISTINCT f.id) as card_count
    FROM topic_ai_metadata ai
    JOIN curriculum_topics ct ON ct.id = ai.topic_id
    LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
    WHERE ai.subject_name = p_subject_name
      AND ai.qualification_level = p_qualification_level
      AND ai.topic_level >= 2  -- Levels 2-4 (not all subjects have level 4)
      AND ai.topic_level <= 4
      AND ai.is_active = true
      AND ai.exam_importance > 0
      AND ct.topic_name IS NOT NULL
      AND LENGTH(ct.topic_name) > 0
    GROUP BY ai.topic_id, ct.topic_name, ai.topic_level, ai.exam_importance
  ),
  max_cards AS (
    SELECT COALESCE(MAX(card_count), 1) as max_count FROM subject_topics
  )
  SELECT 
    st.topic_name,
    st.exam_importance,
    st.card_count::BIGINT,
    ROUND(
      (COALESCE(st.exam_importance, 0) * 0.7 + 
       (st.card_count::NUMERIC / mc.max_count) * 0.3)::NUMERIC, 
      4
    ) as smart_score
  FROM subject_topics st, max_cards mc
  ORDER BY smart_score DESC
  LIMIT p_limit;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO anon;

-- Test: SELECT * FROM get_smart_topic_suggestions('Biology (GCSE)', 'GCSE', 4);
