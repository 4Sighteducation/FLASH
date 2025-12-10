-- ============================================
-- ENHANCED TOPIC QUERY WITH HIERARCHY
-- Get discovered topics with parent relationships built from parent_topic_id
-- ============================================

-- Function to get user's discovered topics with full hierarchy
CREATE OR REPLACE FUNCTION get_user_topics_with_hierarchy(
  p_user_id UUID,
  p_subject_name TEXT
)
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  topic_level INTEGER,
  parent_topic_id UUID,
  parent_name TEXT,
  grandparent_name TEXT,
  card_count BIGINT,
  cards_mastered BIGINT,
  last_studied TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topic_cards AS (
    -- Get all topics this user has cards for
    SELECT 
      f.topic_id,
      COUNT(*) as card_count,
      COUNT(*) FILTER (WHERE f.box_number >= 4) as cards_mastered,
      MAX(cr.reviewed_at) as last_studied
    FROM flashcards f
    LEFT JOIN card_reviews cr ON cr.flashcard_id = f.id
    WHERE f.user_id = p_user_id
    GROUP BY f.topic_id
  )
  SELECT 
    t.id as topic_id,
    t.topic_name,
    t.topic_level,
    t.parent_topic_id,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    COALESCE(utc.card_count, 0)::BIGINT as card_count,
    COALESCE(utc.cards_mastered, 0)::BIGINT as cards_mastered,
    utc.last_studied
  FROM curriculum_topics t
  INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  WHERE ebs.subject_name = p_subject_name
  ORDER BY t.topic_level, parent.topic_name NULLS FIRST, t.topic_name;
END;
$$ LANGUAGE plpgsql;

-- Test the function
-- SELECT * FROM get_user_topics_with_hierarchy(
--   'your-user-id',
--   'Physical Education (A-Level)'
-- );

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_topics_with_hierarchy TO authenticated;

