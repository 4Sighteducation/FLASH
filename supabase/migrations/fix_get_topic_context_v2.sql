-- ============================================
-- FIX v2: get_topic_context() function
-- Rewrite using CTEs to avoid nested aggregation
-- ============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_topic_context(UUID, UUID);

-- Recreate with CTE-based approach (no nested aggregation)
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
  -- Get current topic's parent and level
  SELECT parent_topic_id, topic_level 
  INTO v_parent_id, v_current_level
  FROM curriculum_topics
  WHERE id = p_topic_id;

  -- Build result using separate queries (not nested)
  WITH 
  current_topic_data AS (
    SELECT 
      ct.id,
      ct.topic_name,
      ct.topic_level,
      ct.parent_topic_id,
      COUNT(f.id) as card_count
    FROM curriculum_topics ct
    LEFT JOIN flashcards f ON f.topic_id = ct.id AND f.user_id = p_user_id
    WHERE ct.id = p_topic_id
    GROUP BY ct.id, ct.topic_name, ct.topic_level, ct.parent_topic_id
  ),
  siblings_data AS (
    SELECT 
      sib.id,
      sib.topic_name,
      sib.topic_level,
      COUNT(f.id) as card_count
    FROM curriculum_topics sib
    LEFT JOIN flashcards f ON f.topic_id = sib.id AND f.user_id = p_user_id
    WHERE sib.parent_topic_id = v_parent_id
      AND sib.id != p_topic_id
    GROUP BY sib.id, sib.topic_name, sib.topic_level
  ),
  children_data AS (
    SELECT 
      child.id,
      child.topic_name,
      child.topic_level,
      COUNT(f.id) as card_count
    FROM curriculum_topics child
    LEFT JOIN flashcards f ON f.topic_id = child.id AND f.user_id = p_user_id
    WHERE child.parent_topic_id = p_topic_id
    GROUP BY child.id, child.topic_name, child.topic_level
  ),
  parent_data AS (
    SELECT 
      parent.id,
      parent.topic_name,
      parent.topic_level,
      parent.parent_topic_id,
      COUNT(f.id) as card_count
    FROM curriculum_topics parent
    LEFT JOIN flashcards f ON f.topic_id = parent.id AND f.user_id = p_user_id
    WHERE parent.id = v_parent_id
    GROUP BY parent.id, parent.topic_name, parent.topic_level, parent.parent_topic_id
  ),
  grandparent_data AS (
    SELECT 
      gp.id,
      gp.topic_name,
      gp.topic_level
    FROM curriculum_topics current
    JOIN curriculum_topics parent ON parent.id = current.parent_topic_id
    LEFT JOIN curriculum_topics gp ON gp.id = parent.parent_topic_id
    WHERE current.id = p_topic_id
  )
  SELECT json_build_object(
    'current_topic', (
      SELECT json_build_object(
        'id', id,
        'name', topic_name,
        'level', topic_level,
        'parent_id', parent_topic_id,
        'card_count', card_count
      )
      FROM current_topic_data
    ),
    'siblings', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'name', topic_name,
        'level', topic_level,
        'card_count', card_count,
        'has_cards', card_count > 0
      ) ORDER BY topic_name), '[]'::json)
      FROM siblings_data
    ),
    'children', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id,
        'name', topic_name,
        'level', topic_level,
        'card_count', card_count,
        'has_cards', card_count > 0
      ) ORDER BY topic_name), '[]'::json)
      FROM children_data
    ),
    'parent', (
      SELECT json_build_object(
        'id', id,
        'name', topic_name,
        'level', topic_level,
        'parent_id', parent_topic_id,
        'card_count', card_count,
        'has_cards', card_count > 0
      )
      FROM parent_data
    ),
    'grandparent', (
      SELECT json_build_object(
        'id', id,
        'name', topic_name,
        'level', topic_level
      )
      FROM grandparent_data
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

-- Test with the "telling lies" topic
-- Uncomment to test:
-- SELECT get_topic_context(
--   '4cfdc953-1faa-4382-8d45-5630bbda0dbc',
--   '3e7385e2-ce4b-480d-ace5-ee30b9afee7c'
-- );

