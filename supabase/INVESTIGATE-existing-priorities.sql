-- ============================================
-- INVESTIGATE: Existing user_topic_priorities table
-- ============================================

-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user_topic_priorities'
ORDER BY ordinal_position;

-- 2. Check if there's any data
SELECT COUNT(*) as total_records,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(DISTINCT topic_id) as unique_topics
FROM user_topic_priorities;

-- 3. Sample existing data
SELECT *
FROM user_topic_priorities
LIMIT 10;

-- 4. Check for related functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%priority%'
  OR routine_name LIKE '%topic%';

-- 5. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_topic_priorities';

