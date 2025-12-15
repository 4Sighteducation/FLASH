-- Function: Get Smart Topic Suggestions
-- Purpose: Return 4 most relevant topic suggestions based on actual user popularity
-- Used by: SmartTopicDiscoveryScreen for "Try searching for" suggestions

CREATE OR REPLACE FUNCTION get_smart_topic_suggestions(
  p_subject_name TEXT,
  p_qualification_level TEXT,
  p_limit INTEGER DEFAULT 4
)
RETURNS TABLE (
  topic_name TEXT,
  flashcard_count BIGINT,
  topic_level INTEGER,
  sort_order INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strategy: Rank by flashcard popularity, fallback to curriculum order
  -- Returns topics that users actually study OR well-ordered curriculum topics
  
  RETURN QUERY
  WITH subject_topics AS (
    SELECT 
      ct.topic_id,
      ct.topic_name,
      ct.topic_level,
      ct.sort_order,
      COUNT(DISTINCT f.id) as card_count
    FROM curriculum_topics ct
    JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
    LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
    WHERE ebs.subject_name = p_subject_name
      AND ebs.qualification_level = p_qualification_level
      AND ct.topic_level >= 3  -- Specific enough
      AND ct.topic_level <= 4  -- Not too deep
      AND ct.topic_name IS NOT NULL
      AND LENGTH(ct.topic_name) > 0
    GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ct.sort_order
  )
  SELECT 
    st.topic_name,
    st.card_count::BIGINT,
    st.topic_level,
    st.sort_order
  FROM subject_topics st
  ORDER BY 
    st.card_count DESC,  -- Most popular first
    st.sort_order ASC,   -- Then curriculum order
    st.topic_name ASC    -- Then alphabetical
  LIMIT p_limit;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_smart_topic_suggestions TO anon;

-- Test the function
-- SELECT * FROM get_smart_topic_suggestions('Biology', 'GCSE', 4);
