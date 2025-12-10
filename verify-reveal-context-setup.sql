-- ============================================
-- VERIFY SETUP FOR REVEAL CONTEXT FEATURE
-- Run this to check all necessary elements exist
-- ============================================

-- 1. Check if topic_overview_cards table exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'topic_overview_cards'
ORDER BY ordinal_position;

-- 2. Check if we have the hierarchy data we need
SELECT 
    'Level 1 (Root)' as level,
    COUNT(*) as topic_count
FROM curriculum_topics
WHERE topic_level = 1
UNION ALL
SELECT 
    'Level 2' as level,
    COUNT(*) as topic_count
FROM curriculum_topics
WHERE topic_level = 2
UNION ALL
SELECT 
    'Level 3' as level,
    COUNT(*) as topic_count
FROM curriculum_topics
WHERE topic_level = 3
UNION ALL
SELECT 
    'Level 4' as level,
    COUNT(*) as topic_count
FROM curriculum_topics
WHERE topic_level = 4
UNION ALL
SELECT 
    'Level 5' as level,
    COUNT(*) as topic_count
FROM curriculum_topics
WHERE topic_level = 5;

-- 3. Test getting siblings for a topic
-- Using viral marketing example if it exists
SELECT 
    ct.id,
    ct.topic_name,
    ct.topic_level,
    ct.parent_topic_id,
    parent.topic_name as parent_name
FROM curriculum_topics ct
LEFT JOIN curriculum_topics parent ON parent.id = ct.parent_topic_id
WHERE ct.topic_name ILIKE '%viral marketing%'
LIMIT 5;

-- 4. Create the get_topic_context RPC function
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
        'card_count', COUNT(DISTINCT f.id),
        'full_path', ct.full_path
      )
      FROM curriculum_topics ct
      LEFT JOIN flashcards f ON f.topic_id = ct.id AND f.user_id = p_user_id
      WHERE ct.id = p_topic_id
      GROUP BY ct.id, ct.full_path
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

-- 5. Test the function
SELECT get_topic_context(
  (SELECT id FROM curriculum_topics WHERE topic_name ILIKE '%viral marketing%' LIMIT 1),
  'b58c17d8-8d6e-4106-83ac-86b8441b6701' -- Replace with a real user_id
);

-- 6. Verify topic_overview_cards structure
SELECT 
    COUNT(*) as existing_overview_cards,
    COUNT(DISTINCT parent_topic_id) as parents_with_overviews
FROM topic_overview_cards;


