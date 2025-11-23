-- ========================================
-- Specification Update Tracking System
-- ========================================
-- Helps track when specs change and what needs updating

-- 1. Track specification versions
CREATE TABLE IF NOT EXISTS specification_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_board text NOT NULL,
  qualification_type text NOT NULL,
  subject_code text NOT NULL,
  spec_version text NOT NULL,
  spec_hash text, -- SHA256 of spec PDF
  first_seen timestamp DEFAULT NOW(),
  last_verified timestamp DEFAULT NOW(),
  spec_url text,
  changes_detected jsonb, -- Store what changed
  UNIQUE(exam_board, qualification_type, subject_code, spec_version)
);

-- 2. Track topic changes
CREATE TABLE IF NOT EXISTS topic_change_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id uuid REFERENCES curriculum_topics(id),
  change_type text CHECK (change_type IN ('added', 'modified', 'removed', 'reordered')),
  old_value jsonb,
  new_value jsonb,
  detected_at timestamp DEFAULT NOW(),
  migration_batch text -- Track which migration/scrape batch
);

-- 3. View to find topics needing re-generation
CREATE OR REPLACE VIEW topics_needing_refresh AS
SELECT 
  ct.*,
  tcl.change_type,
  tcl.detected_at as change_detected
FROM curriculum_topics ct
JOIN topic_change_log tcl ON ct.id = tcl.topic_id
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE tcl.detected_at > COALESCE(tam.updated_at, '2000-01-01'::timestamp)
  AND tcl.change_type IN ('added', 'modified');

-- 4. Function to detect changes after new scrape
CREATE OR REPLACE FUNCTION detect_topic_changes(p_exam_board text)
RETURNS TABLE (
  change_summary text,
  topics_added int,
  topics_modified int,
  topics_removed int
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_added int;
  v_modified int;
  v_removed int;
BEGIN
  -- Find new topics
  SELECT COUNT(*) INTO v_added
  FROM staging_aqa_topics st
  WHERE st.exam_board = p_exam_board
    AND NOT EXISTS (
      SELECT 1 FROM curriculum_topics ct
      JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
      JOIN exam_boards eb ON ebs.exam_board_id = eb.id
      WHERE eb.code = p_exam_board
        AND ct.topic_code = st.topic_code
    );

  -- Find modified topics (name changes)
  SELECT COUNT(*) INTO v_modified  
  FROM staging_aqa_topics st
  JOIN curriculum_topics ct ON ct.topic_code = st.topic_code
  JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = p_exam_board
    AND st.topic_name != ct.topic_name;

  -- Find removed topics
  SELECT COUNT(*) INTO v_removed
  FROM curriculum_topics ct
  JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = p_exam_board
    AND NOT EXISTS (
      SELECT 1 FROM staging_aqa_topics st
      WHERE st.exam_board = p_exam_board
        AND st.topic_code = ct.topic_code
    );

  RETURN QUERY
  SELECT 
    format('%s: +%s new, ~%s modified, -%s removed', p_exam_board, v_added, v_modified, v_removed),
    v_added,
    v_modified,
    v_removed;
END;
$$;

-- 5. Quick check what needs updating
CREATE OR REPLACE FUNCTION check_update_status()
RETURNS TABLE (
  status text,
  topics_with_metadata int,
  topics_without_metadata int,
  topics_with_changes int,
  last_generation timestamp
)
LANGUAGE sql
AS $$
  SELECT
    'Current Status' as status,
    (SELECT COUNT(*) FROM topic_ai_metadata) as topics_with_metadata,
    (SELECT COUNT(*) FROM curriculum_topics ct 
     WHERE NOT EXISTS (SELECT 1 FROM topic_ai_metadata tam WHERE tam.topic_id = ct.id)) as topics_without_metadata,
    (SELECT COUNT(*) FROM topics_needing_refresh) as topics_with_changes,
    (SELECT MAX(created_at) FROM topic_ai_metadata) as last_generation;
$$;
