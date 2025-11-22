-- VERIFY: pgvector Setup Complete
-- Run this AFTER running 001_setup_pgvector_topic_search.sql
-- All queries should return results with no errors

-- ========================================
-- 1. CHECK PGVECTOR EXTENSION
-- ========================================
SELECT 
  '✅ Check 1: pgvector Extension' as test_name,
  extname,
  extversion
FROM pg_extension 
WHERE extname = 'vector';
-- Expected: 1 row showing 'vector' extension

-- ========================================
-- 2. CHECK TABLE EXISTS
-- ========================================
SELECT 
  '✅ Check 2: topic_ai_metadata Table' as test_name,
  COUNT(*) as current_rows,
  CASE 
    WHEN COUNT(*) = 0 THEN 'Empty - ready for batch generation'
    ELSE 'Has data - incremental updates will work'
  END as status
FROM topic_ai_metadata;
-- Expected: 0 rows initially

-- ========================================
-- 3. CHECK INDEXES
-- ========================================
SELECT 
  '✅ Check 3: Indexes Created' as test_name,
  indexname
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata'
ORDER BY indexname;
-- Expected: 6-7 indexes including one with 'hnsw' or 'ivf' in name

-- ========================================
-- 4. CHECK VIEW WORKS
-- ========================================
SELECT 
  '✅ Check 4: topics_with_context View' as test_name,
  COUNT(*) as total_topics,
  COUNT(DISTINCT exam_board) as exam_boards,
  COUNT(DISTINCT qualification_level) as qual_levels,
  COUNT(DISTINCT subject_name) as subjects
FROM topics_with_context;
-- Expected: ~54,000 topics, 7 boards, 2-4 qual levels, 300+ subjects

-- ========================================
-- 5. CHECK HELPER FUNCTION
-- ========================================
SELECT 
  '✅ Check 5: Topics Needing Metadata' as test_name,
  COUNT(*) as topics_needing_metadata,
  COUNT(DISTINCT exam_board) as boards,
  COUNT(DISTINCT subject_name) as subjects
FROM get_topics_needing_metadata();
-- Expected: Same as total topics (all need metadata initially)

-- ========================================
-- 6. SAMPLE TOPICS FROM VIEW
-- ========================================
SELECT 
  '✅ Check 6: Sample Topics' as test_name,
  exam_board,
  qualification_level,
  subject_name,
  topic_name,
  topic_code,
  topic_level,
  full_path
FROM topics_with_context
ORDER BY exam_board, qualification_level, subject_name, topic_level
LIMIT 10;
-- Expected: 10 sample topics with full hierarchical paths

-- ========================================
-- 7. TEST RPC FUNCTION (with dummy embedding)
-- ========================================

-- Create a test embedding (all zeros - just for testing structure)
DO $$
DECLARE
  test_embedding vector(1536);
BEGIN
  -- Generate dummy embedding
  test_embedding := array_fill(0, ARRAY[1536])::vector(1536);
  
  -- Test the RPC function
  PERFORM * FROM match_topics(
    test_embedding,
    NULL,  -- no board filter
    NULL,  -- no level filter  
    NULL,  -- no subject filter
    0.0,   -- no threshold
    5      -- limit 5 results
  );
  
  RAISE NOTICE '✅ Check 7: match_topics RPC function works ✓';
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ match_topics RPC function failed: %', SQLERRM;
END $$;

-- ========================================
-- 8. CHECK BREAKDOWN BY EXAM BOARD
-- ========================================
SELECT 
  '✅ Check 8: Topics by Exam Board' as test_name,
  exam_board,
  qualification_level,
  COUNT(*) as topic_count
FROM topics_with_context
GROUP BY exam_board, qualification_level
ORDER BY exam_board, qualification_level;
-- Expected: Breakdown showing AQA, Edexcel, OCR etc. with topic counts

-- ========================================
-- FINAL STATUS
-- ========================================

SELECT 
  '🎉 SETUP COMPLETE!' as status,
  'Ready for batch metadata generation' as next_step,
  COUNT(*) as topics_ready_to_process
FROM get_topics_needing_metadata();

