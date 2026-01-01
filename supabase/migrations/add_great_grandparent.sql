-- ============================================
-- FIX: Add great-grandparent (Level 0 parent) to hierarchy queries
-- ============================================

-- Update get_user_topics_with_hierarchy to include Level 0
DROP FUNCTION IF EXISTS get_user_topics_with_hierarchy(UUID, TEXT);

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
  great_grandparent_name TEXT,
  card_count BIGINT,
  cards_mastered BIGINT,
  last_studied TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH user_topic_cards AS (
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
    COALESCE(t.display_name, t.topic_name) as topic_name,
    t.topic_level,
    t.parent_topic_id,
    COALESCE(parent.display_name, parent.topic_name) as parent_name,
    COALESCE(grandparent.display_name, grandparent.topic_name) as grandparent_name,
    COALESCE(great_grandparent.display_name, great_grandparent.topic_name) as great_grandparent_name,
    COALESCE(utc.card_count, 0)::BIGINT as card_count,
    COALESCE(utc.cards_mastered, 0)::BIGINT as cards_mastered,
    utc.last_studied
  FROM curriculum_topics t
  INNER JOIN user_topic_cards utc ON utc.topic_id = t.id
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  LEFT JOIN curriculum_topics great_grandparent ON great_grandparent.id = grandparent.parent_topic_id
  WHERE ebs.subject_name = p_subject_name
  ORDER BY t.topic_level, COALESCE(parent.display_name, parent.topic_name) NULLS FIRST, COALESCE(t.display_name, t.topic_name);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_topics_with_hierarchy TO authenticated;

-- Test with your user
SELECT * FROM get_user_topics_with_hierarchy(
  'da52b509-99df-4743-bf36-d3fd1858d0a6',
  'Chemistry (A-Level)'
);




