-- Test Smart Suggestions with Real User
-- User: stu500@vespa.academy

-- Step 1: Get user ID
SELECT id, email FROM users WHERE email = 'stu500@vespa.academy';

-- Step 2: See what Biology topics they already have cards for
-- Replace USER-ID with result from Step 1
-- SELECT DISTINCT topic, topic_id 
-- FROM flashcards 
-- WHERE user_id = 'USER-ID-HERE'
--   AND subject_name LIKE '%Biology%'
-- ORDER BY topic;

-- Step 3: Test smart suggestions function
-- Should return topics they DON'T have cards for yet!
-- SELECT * FROM get_smart_topic_suggestions('Biology (GCSE)', 'GCSE', 'USER-ID-HERE', 4);

-- Step 4: Compare with ALL top topics (no user filter)
-- This shows what the suggestions would be without excluding user topics
-- SELECT 
--   ct.topic_name,
--   ai.exam_importance,
--   COUNT(DISTINCT f.id) as overall_cards
-- FROM topic_ai_metadata ai
-- JOIN curriculum_topics ct ON ct.id = ai.topic_id
-- LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
-- WHERE ai.subject_name = 'Biology (GCSE)'
--   AND ai.qualification_level = 'GCSE'
--   AND ai.topic_level >= 2
--   AND ai.topic_level <= 4
--   AND ai.is_active = true
--   AND ai.exam_importance > 0
-- GROUP BY ai.topic_id, ct.topic_name, ai.exam_importance
-- ORDER BY ai.exam_importance DESC, overall_cards DESC
-- LIMIT 10;
