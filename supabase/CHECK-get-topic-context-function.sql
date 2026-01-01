-- ============================================
-- CHECK: What's currently in get_topic_context?
-- ============================================

-- Get the actual function definition
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_topic_context';

-- If the above shows the function exists, let's test it with a real topic
-- Uncomment and run with actual values:
-- SELECT get_topic_context(
--   '4cfdc953-1faa-4382-8d45-5630bbda0dbc', -- telling lies topic
--   '3e7385e2-ce4b-480d-ace5-ee30b9afee7c'  -- your user ID
-- );




