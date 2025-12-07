-- Test if both RPC functions exist and work

-- Test 1: Check if search_subjects_with_boards exists (NEW function)
SELECT * FROM search_subjects_with_boards('Biology', 'GCSE') LIMIT 3;

-- Test 2: Check if match_topics exists (YOUR vector search)
-- First we need a dummy embedding (1536 dimensions)
-- This will fail if function doesn't exist
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('match_topics', 'search_subjects_with_boards');
