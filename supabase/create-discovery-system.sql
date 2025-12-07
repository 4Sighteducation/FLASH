-- Create Gamified Topic Discovery System
-- Date: December 7, 2025
-- Purpose: Enable progressive topic discovery with completion tracking

-- ============================================
-- STEP 1: Create user_discovered_topics Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_discovered_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES exam_board_subjects(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  
  -- Discovery metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  discovery_method VARCHAR(50) DEFAULT 'search', -- 'search', 'browse', 'suggestion', 'auto'
  search_query TEXT, -- What they searched to find this
  
  -- Progress tracking (updated by triggers)
  card_count INT DEFAULT 0,
  cards_mastered INT DEFAULT 0, -- Cards in box 5
  last_card_created_at TIMESTAMPTZ,
  last_studied_at TIMESTAMPTZ,
  
  -- Gamification
  is_newly_discovered BOOLEAN DEFAULT true, -- Show glow effect for 24 hours
  viewed_at TIMESTAMPTZ, -- When user first viewed this topic
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each user can only discover each topic once
  UNIQUE(user_id, topic_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_user_discovered_topics_user 
  ON user_discovered_topics(user_id);
  
CREATE INDEX IF NOT EXISTS idx_user_discovered_topics_user_subject 
  ON user_discovered_topics(user_id, subject_id);
  
CREATE INDEX IF NOT EXISTS idx_user_discovered_topics_newly_discovered
  ON user_discovered_topics(user_id) 
  WHERE is_newly_discovered = true;

-- ============================================
-- STEP 2: Add Completion Tracking to user_subjects
-- ============================================

ALTER TABLE user_subjects
ADD COLUMN IF NOT EXISTS total_curriculum_topics INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS discovered_topics_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_percentage FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS last_topic_discovered_at TIMESTAMPTZ;

-- ============================================
-- STEP 3: Function to Calculate Subject Completion
-- ============================================

CREATE OR REPLACE FUNCTION calculate_subject_completion(
  p_user_id UUID,
  p_subject_id UUID
)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  important_topics_count INT;
  discovered_count INT;
  completion FLOAT;
BEGIN
  -- Count high-importance topics (exam_importance >= 0.7)
  SELECT COUNT(*) INTO important_topics_count
  FROM topic_ai_metadata tam
  WHERE tam.subject_name IN (
    SELECT subject_name FROM exam_board_subjects WHERE id = p_subject_id
  )
  AND tam.exam_importance >= 0.7
  AND tam.is_active = true;
  
  -- If no AI metadata, fallback to all topics
  IF important_topics_count = 0 THEN
    SELECT COUNT(*) INTO important_topics_count
    FROM curriculum_topics
    WHERE exam_board_subject_id = p_subject_id;
  END IF;
  
  -- Count discovered topics
  SELECT COUNT(*) INTO discovered_count
  FROM user_discovered_topics
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  -- Calculate percentage
  IF important_topics_count = 0 THEN
    RETURN 0.0;
  END IF;
  
  completion := (discovered_count::FLOAT / important_topics_count::FLOAT) * 100.0;
  
  -- Update user_subjects table
  UPDATE user_subjects
  SET 
    total_curriculum_topics = important_topics_count,
    discovered_topics_count = discovered_count,
    completion_percentage = completion,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  RETURN completion;
END;
$$;

-- ============================================
-- STEP 4: Function to Mark Topic as Discovered
-- ============================================

CREATE OR REPLACE FUNCTION discover_topic(
  p_user_id UUID,
  p_subject_id UUID,
  p_topic_id UUID,
  p_discovery_method VARCHAR(50) DEFAULT 'search',
  p_search_query TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  discovery_id UUID;
BEGIN
  -- Insert or update discovered topic
  INSERT INTO user_discovered_topics (
    user_id,
    subject_id,
    topic_id,
    discovery_method,
    search_query,
    is_newly_discovered,
    discovered_at
  ) VALUES (
    p_user_id,
    p_subject_id,
    p_topic_id,
    p_discovery_method,
    p_search_query,
    true,
    NOW()
  )
  ON CONFLICT (user_id, topic_id) 
  DO UPDATE SET
    discovery_method = EXCLUDED.discovery_method,
    search_query = COALESCE(EXCLUDED.search_query, user_discovered_topics.search_query),
    updated_at = NOW()
  RETURNING id INTO discovery_id;
  
  -- Update subject completion percentage
  PERFORM calculate_subject_completion(p_user_id, p_subject_id);
  
  -- Update last discovered timestamp
  UPDATE user_subjects
  SET last_topic_discovered_at = NOW()
  WHERE user_id = p_user_id
    AND subject_id = p_subject_id;
  
  RETURN discovery_id;
END;
$$;

-- ============================================
-- STEP 5: Trigger to Update Card Counts
-- ============================================

CREATE OR REPLACE FUNCTION update_discovered_topic_card_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update card count for discovered topic
  UPDATE user_discovered_topics
  SET 
    card_count = (
      SELECT COUNT(*) 
      FROM flashcards 
      WHERE user_id = NEW.user_id 
        AND topic_id = NEW.topic_id
    ),
    cards_mastered = (
      SELECT COUNT(*) 
      FROM flashcards 
      WHERE user_id = NEW.user_id 
        AND topic_id = NEW.topic_id
        AND box_number = 5
    ),
    last_card_created_at = NEW.created_at,
    updated_at = NOW()
  WHERE user_id = NEW.user_id
    AND topic_id = NEW.topic_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger on flashcards table
DROP TRIGGER IF EXISTS trigger_update_discovered_topic_count ON flashcards;
CREATE TRIGGER trigger_update_discovered_topic_count
  AFTER INSERT ON flashcards
  FOR EACH ROW
  EXECUTE FUNCTION update_discovered_topic_card_count();

-- ============================================
-- STEP 6: Function to Mark Topics as "Seen" (not new anymore)
-- ============================================

CREATE OR REPLACE FUNCTION mark_topics_as_seen(
  p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count INT;
BEGIN
  -- Mark topics discovered >24 hours ago as no longer new
  UPDATE user_discovered_topics
  SET 
    is_newly_discovered = false,
    viewed_at = NOW()
  WHERE user_id = p_user_id
    AND is_newly_discovered = true
    AND discovered_at < NOW() - INTERVAL '24 hours'
  RETURNING 1 INTO updated_count;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================
-- STEP 7: View for Easy Querying
-- ============================================

CREATE OR REPLACE VIEW user_topics_with_progress AS
SELECT 
  udt.id as discovery_id,
  udt.user_id,
  udt.subject_id,
  udt.topic_id,
  udt.discovered_at,
  udt.discovery_method,
  udt.search_query,
  udt.card_count,
  udt.cards_mastered,
  udt.is_newly_discovered,
  
  -- Topic details
  ct.topic_name,
  ct.topic_level,
  ct.topic_code,
  
  -- Subject details
  ebs.subject_name,
  us.exam_board,
  us.completion_percentage as subject_completion,
  
  -- AI metadata (if available)
  tam.plain_english_summary,
  tam.difficulty_band,
  tam.exam_importance,
  tam.full_path
  
FROM user_discovered_topics udt
JOIN curriculum_topics ct ON udt.topic_id = ct.id
JOIN exam_board_subjects ebs ON udt.subject_id = ebs.id
JOIN user_subjects us ON udt.user_id = us.user_id AND udt.subject_id = us.subject_id
LEFT JOIN topic_ai_metadata tam ON udt.topic_id = tam.topic_id
ORDER BY udt.discovered_at DESC;

-- ============================================
-- STEP 8: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON user_discovered_topics TO authenticated;
GRANT SELECT ON user_topics_with_progress TO authenticated;
GRANT EXECUTE ON FUNCTION discover_topic TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_subject_completion TO authenticated;
GRANT EXECUTE ON FUNCTION mark_topics_as_seen TO authenticated;

-- ============================================
-- STEP 9: Test the System
-- ============================================

-- Test discovering a topic
/*
SELECT discover_topic(
  'USER_ID_HERE',
  'SUBJECT_ID_HERE',
  'TOPIC_ID_HERE',
  'search',
  'photosynthesis'
);

-- Check completion
SELECT calculate_subject_completion('USER_ID_HERE', 'SUBJECT_ID_HERE');

-- View discovered topics
SELECT * FROM user_topics_with_progress 
WHERE user_id = 'USER_ID_HERE'
LIMIT 10;
*/

-- ============================================
-- SUCCESS!
-- ============================================

-- Gamified discovery system created!
-- Next: Deploy to Supabase and build the UI
