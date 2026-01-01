-- ============================================
-- ADD display_name COLUMN FOR AI-ENHANCED NAMES
-- ============================================

-- Add display_name column for improved topic names
ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add flag to track which topics need enhancement
ALTER TABLE curriculum_topics 
ADD COLUMN IF NOT EXISTS needs_name_enhancement BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_display_name 
ON curriculum_topics(display_name) 
WHERE display_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_curriculum_topics_needs_enhancement 
ON curriculum_topics(needs_name_enhancement) 
WHERE needs_name_enhancement = TRUE;

-- Function to detect topics with poor names
CREATE OR REPLACE FUNCTION detect_poor_topic_names()
RETURNS TABLE (
  topic_id UUID,
  topic_name TEXT,
  topic_level INTEGER,
  parent_name TEXT,
  grandparent_name TEXT,
  subject_name TEXT,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as topic_id,
    t.topic_name,
    t.topic_level,
    parent.topic_name as parent_name,
    grandparent.topic_name as grandparent_name,
    ebs.subject_name,
    CASE 
      WHEN LENGTH(t.topic_name) <= 3 THEN 'Too short (≤3 chars)'
      WHEN t.topic_name ~ '^[0-9]+$' THEN 'Just numbers'
      WHEN t.topic_name ~ '^[0-9]+\.[0-9]+$' THEN 'Number code only'
      WHEN t.topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+' THEN 'Nested number code'
      ELSE 'Other'
    END as reason
  FROM curriculum_topics t
  INNER JOIN exam_board_subjects ebs ON ebs.id = t.exam_board_subject_id
  LEFT JOIN curriculum_topics parent ON parent.id = t.parent_topic_id
  LEFT JOIN curriculum_topics grandparent ON grandparent.id = parent.parent_topic_id
  WHERE 
    t.display_name IS NULL AND (
      LENGTH(t.topic_name) <= 3 OR
      t.topic_name ~ '^[0-9]+$' OR
      t.topic_name ~ '^[0-9]+\.[0-9]+' OR
      t.topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+'
    )
  ORDER BY ebs.subject_name, t.topic_level, t.topic_name;
END;
$$ LANGUAGE plpgsql;

-- Mark all poor names for enhancement
UPDATE curriculum_topics
SET needs_name_enhancement = TRUE
WHERE display_name IS NULL AND (
  LENGTH(topic_name) <= 3 OR
  topic_name ~ '^[0-9]+$' OR
  topic_name ~ '^[0-9]+\.[0-9]+' OR
  topic_name ~ '^[0-9]+\.[0-9]+\.[0-9]+'
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION detect_poor_topic_names TO authenticated;

-- Verify
SELECT 
    COUNT(*) as topics_needing_enhancement,
    COUNT(DISTINCT exam_board_subject_id) as affected_subjects
FROM curriculum_topics
WHERE needs_name_enhancement = TRUE;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'curriculum_topics' 
  AND column_name IN ('display_name', 'needs_name_enhancement');




