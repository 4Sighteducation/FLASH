-- Test Queries for Gamified Discovery System
-- Date: December 7, 2025
-- Run these in Supabase SQL Editor to verify everything works

-- ============================================
-- TEST 1: Verify Tables Were Created
-- ============================================

-- Should show the new table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'user_discovered_topics';

-- Should show all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_discovered_topics'
ORDER BY ordinal_position;


-- ============================================
-- TEST 2: Verify Functions Exist
-- ============================================

-- Should show 3 functions
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'discover_topic',
  'calculate_subject_completion',
  'mark_topics_as_seen'
);


-- ============================================
-- TEST 3: Get a Test User and Subject
-- ============================================

-- Get a recent test user
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Get their subject
SELECT 
  us.id as user_subject_id,
  us.user_id,
  us.subject_id,
  ebs.subject_name,
  us.exam_board
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
ORDER BY us.created_at DESC
LIMIT 5;

-- Get a topic from their subject
SELECT 
  ct.id as topic_id,
  ct.topic_name,
  ct.topic_level,
  ebs.subject_name
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
WHERE ebs.id = 'SUBJECT_ID_FROM_ABOVE'
  AND ct.topic_level >= 2  -- Get actual topics, not just modules
LIMIT 5;


-- ============================================
-- TEST 4: Simulate Topic Discovery
-- ============================================

-- Replace these with actual IDs from TEST 3:
-- USER_ID, SUBJECT_ID, TOPIC_ID

-- Discover a topic via search
SELECT discover_topic(
  'USER_ID_HERE'::uuid,
  'SUBJECT_ID_HERE'::uuid,
  'TOPIC_ID_HERE'::uuid,
  'search',
  'photosynthesis'
);

-- Check it was added
SELECT 
  topic_id,
  discovery_method,
  search_query,
  discovered_at,
  is_newly_discovered
FROM user_discovered_topics
WHERE user_id = 'USER_ID_HERE'::uuid
ORDER BY discovered_at DESC;


-- ============================================
-- TEST 5: Calculate Completion %
-- ============================================

-- Calculate completion for the subject
SELECT calculate_subject_completion(
  'USER_ID_HERE'::uuid,
  'SUBJECT_ID_HERE'::uuid
);

-- Check updated user_subjects
SELECT 
  subject_id,
  total_curriculum_topics,
  discovered_topics_count,
  completion_percentage,
  last_topic_discovered_at
FROM user_subjects
WHERE user_id = 'USER_ID_HERE'::uuid;


-- ============================================
-- TEST 6: Test the View
-- ============================================

-- Query the helper view
SELECT 
  topic_name,
  discovery_method,
  search_query,
  card_count,
  exam_importance,
  subject_completion,
  full_path
FROM user_topics_with_progress
WHERE user_id = 'USER_ID_HERE'::uuid
LIMIT 10;


-- ============================================
-- TEST 7: Simulate Adding More Topics
-- ============================================

-- Discover 3 more topics to test completion %
SELECT discover_topic(
  'USER_ID_HERE'::uuid,
  'SUBJECT_ID_HERE'::uuid,
  'ANOTHER_TOPIC_ID'::uuid,
  'search',
  'cells'
);

-- Check completion increased
SELECT calculate_subject_completion(
  'USER_ID_HERE'::uuid,
  'SUBJECT_ID_HERE'::uuid
);


-- ============================================
-- TEST 8: Test Mark as Seen (24 hour timer)
-- ============================================

-- Manually set discovery time to 25 hours ago (for testing)
UPDATE user_discovered_topics
SET discovered_at = NOW() - INTERVAL '25 hours'
WHERE user_id = 'USER_ID_HERE'::uuid
  AND topic_id = 'TOPIC_ID_HERE'::uuid;

-- Run the mark as seen function
SELECT mark_topics_as_seen('USER_ID_HERE'::uuid);

-- Verify is_newly_discovered is now false
SELECT 
  topic_id,
  is_newly_discovered,
  discovered_at,
  viewed_at
FROM user_discovered_topics
WHERE user_id = 'USER_ID_HERE'::uuid;


-- ============================================
-- TEST 9: Get High-Importance Topics for a Subject
-- ============================================

-- This is how completion % is calculated
SELECT 
  tam.topic_id,
  tam.plain_english_summary,
  tam.exam_importance,
  tam.difficulty_band
FROM topic_ai_metadata tam
WHERE tam.subject_name = 'Biology (GCSE)'
  AND tam.exam_board = 'Edexcel'
  AND tam.exam_importance >= 0.7
  AND tam.is_active = true
ORDER BY tam.exam_importance DESC
LIMIT 10;

-- Count them
SELECT COUNT(*) as high_importance_topics
FROM topic_ai_metadata tam
WHERE tam.subject_name = 'Biology (GCSE)'
  AND tam.exam_board = 'Edexcel'
  AND tam.exam_importance >= 0.7
  AND tam.is_active = true;


-- ============================================
-- TEST 10: Full System Test - Create Complete User Journey
-- ============================================

-- Get or create test user
-- (Use an existing test user from TEST 3)

-- Step 1: User discovers first topic
SELECT discover_topic(
  'USER_ID'::uuid,
  'SUBJECT_ID'::uuid,
  'TOPIC_1_ID'::uuid,
  'search',
  'cells'
);

-- Step 2: Check completion (should be ~1-2%)
SELECT calculate_subject_completion('USER_ID'::uuid, 'SUBJECT_ID'::uuid);

-- Step 3: Discover 5 more topics
-- (Repeat discover_topic calls with different topic IDs)

-- Step 4: Check completion increased (should be ~5-10%)
SELECT calculate_subject_completion('USER_ID'::uuid, 'SUBJECT_ID'::uuid);

-- Step 5: View user's progress
SELECT 
  subject_name,
  discovered_topics_count || ' topics discovered' as progress,
  ROUND(completion_percentage, 1) || '%' as completion,
  exam_board
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
WHERE us.user_id = 'USER_ID'::uuid;


-- ============================================
-- SUCCESS CRITERIA
-- ============================================

/*
✅ user_discovered_topics table exists
✅ All functions created successfully
✅ Can discover topics
✅ Completion % calculates correctly
✅ View shows data properly
✅ Triggers update card counts
✅ Mark as seen works after 24 hours

If all tests pass, the system is ready! 🎉
*/
