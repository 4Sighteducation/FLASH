-- ============================================
-- FIX: get_topic_context() function
-- Remove reference to non-existent 'full_path' column
-- ============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_topic_context(UUID, UUID);

-- Recreate with correct columns only
CREATE OR REPLACE FUNCTION get_topic_context(
  p_topic_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_parent_id UUID;
  v_current_level INT;
BEGIN
  -- Get current topic info
  SELECT parent_topic_id, topic_level INTO v_parent_id, v_current_level
  FROM curriculum_topics
  WHERE id = p_topic_id;

  SELECT json_build_object(
    'current_topic', (
      SELECT json_build_object(
        'id', ct.id,
        'name', ct.topic_name,
        'level', ct.topic_level,
        'parent_id', ct.parent_topic_id,
        'card_count', COUNT(DISTINCT f.id)
        -- REMOVED: 'full_path', ct.full_path (column doesn't exist!)
      )
      FROM curriculum_topics ct
      LEFT JOIN flashcards f ON f.topic_id = ct.id AND f.user_id = p_user_id
      WHERE ct.id = p_topic_id
      GROUP BY ct.id  -- FIXED: Removed ct.full_path from GROUP BY
    ),
    'siblings', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', sib.id,
        'name', sib.topic_name,
        'level', sib.topic_level,
        'card_count', COUNT(DISTINCT f.id),
        'has_cards', COUNT(DISTINCT f.id) > 0
      ) ORDER BY sib.topic_name), '[]'::json)
      FROM curriculum_topics sib
      LEFT JOIN flashcards f ON f.topic_id = sib.id AND f.user_id = p_user_id
      WHERE sib.parent_topic_id = v_parent_id
        AND sib.id != p_topic_id
      GROUP BY sib.id
    ),
    'children', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', child.id,
        'name', child.topic_name,
        'level', child.topic_level,
        'card_count', COUNT(DISTINCT f.id),
        'has_cards', COUNT(DISTINCT f.id) > 0
      ) ORDER BY child.topic_name), '[]'::json)
      FROM curriculum_topics child
      LEFT JOIN flashcards f ON f.topic_id = child.id AND f.user_id = p_user_id
      WHERE child.parent_topic_id = p_topic_id
      GROUP BY child.id
    ),
    'parent', (
      SELECT json_build_object(
        'id', parent.id,
        'name', parent.topic_name,
        'level', parent.topic_level,
        'parent_id', parent.parent_topic_id,
        'card_count', COUNT(DISTINCT f.id),
        'has_cards', COUNT(DISTINCT f.id) > 0
      )
      FROM curriculum_topics parent
      LEFT JOIN flashcards f ON f.topic_id = parent.id AND f.user_id = p_user_id
      WHERE parent.id = v_parent_id
      GROUP BY parent.id
    ),
    'grandparent', (
      SELECT json_build_object(
        'id', gp.id,
        'name', gp.topic_name,
        'level', gp.topic_level
      )
      FROM curriculum_topics current
      JOIN curriculum_topics parent ON parent.id = current.parent_topic_id
      LEFT JOIN curriculum_topics gp ON gp.id = parent.parent_topic_id
      WHERE current.id = p_topic_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Verify the function was created
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_topic_context';

-- Test with a real topic (if one exists)
-- Uncomment and replace with actual values to test:
-- SELECT get_topic_context(
--   (SELECT id FROM curriculum_topics LIMIT 1),
--   'your-user-id-here'
-- );


