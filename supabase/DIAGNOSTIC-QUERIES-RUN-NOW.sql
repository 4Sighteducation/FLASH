-- ================================================================
-- DIAGNOSTIC QUERIES - RUN IN SUPABASE SQL EDITOR
-- ================================================================
-- Purpose: Assess current state of curriculum data
-- Run each query separately and review results
-- ================================================================

-- ================================================================
-- QUERY 1: Overall Database Health Check
-- ================================================================
-- Shows total counts and basic structure
SELECT 
  'Database Overview' as check_name,
  (SELECT COUNT(*) FROM exam_boards) as exam_boards_count,
  (SELECT COUNT(*) FROM qualification_types) as qualification_types_count,
  (SELECT COUNT(*) FROM exam_board_subjects) as subjects_count,
  (SELECT COUNT(*) FROM curriculum_topics) as total_topics_count,
  (SELECT COUNT(DISTINCT user_id) FROM user_topics) as users_with_topics,
  (SELECT COUNT(*) FROM user_topics) as user_topic_selections;

-- ================================================================
-- QUERY 2: Topics Per Board (High-Level Summary)
-- ================================================================
-- Shows how many topics each exam board has
-- EXPECTED: AQA ~7000, OCR ~4000, Edexcel ~3000, WJEC ~2000, CCEA ~3500, SQA ~700
-- 🚨 If any board has 0 topics, that's a problem
SELECT 
  eb.code as exam_board,
  eb.full_name,
  COUNT(DISTINCT ebs.id) as subject_count,
  COUNT(ct.id) as total_topics,
  ROUND(AVG(topic_counts.topics_per_subject), 1) as avg_topics_per_subject,
  MAX(topic_counts.topics_per_subject) as max_topics_in_one_subject
FROM exam_boards eb
LEFT JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
LEFT JOIN (
  SELECT 
    ebs2.exam_board_id,
    ebs2.id as subject_id,
    COUNT(ct2.id) as topics_per_subject
  FROM exam_board_subjects ebs2
  LEFT JOIN curriculum_topics ct2 ON ct2.exam_board_subject_id = ebs2.id
  GROUP BY ebs2.exam_board_id, ebs2.id
) topic_counts ON topic_counts.exam_board_id = eb.id
GROUP BY eb.code, eb.full_name
ORDER BY COUNT(ct.id) DESC;

-- ================================================================
-- QUERY 3: 🚨 CRITICAL - Find Subjects with Excessive Topics
-- ================================================================
-- This will show us the "AQA Accounting hundreds of topics" problem
-- EXPECTED: Most subjects should have 30-150 topics
-- 🚨 If you see subjects with 300+, those are likely duplicates
SELECT 
  eb.code as exam_board,
  qt.code as qual_type,
  ebs.subject_name,
  COUNT(ct.id) as topic_count,
  CASE 
    WHEN COUNT(ct.id) > 300 THEN '🚨 CRITICAL - Likely Duplicates'
    WHEN COUNT(ct.id) > 200 THEN '⚠️ HIGH - Review Needed'
    WHEN COUNT(ct.id) > 150 THEN '⚠️ Elevated'
    WHEN COUNT(ct.id) < 10 THEN '⚠️ TOO FEW - Incomplete'
    ELSE '✅ Normal Range'
  END as status,
  -- Show topic level breakdown
  COUNT(CASE WHEN ct.topic_level = 1 THEN 1 END) as level_1_modules,
  COUNT(CASE WHEN ct.topic_level = 2 THEN 1 END) as level_2_topics,
  COUNT(CASE WHEN ct.topic_level = 3 THEN 1 END) as level_3_subtopics
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
GROUP BY eb.code, qt.code, ebs.subject_name, ebs.id
HAVING COUNT(ct.id) > 200 OR COUNT(ct.id) < 10
ORDER BY COUNT(ct.id) DESC;

-- ================================================================
-- QUERY 4: Check for Duplicate Topics (Same Name, Same Subject)
-- ================================================================
-- This finds actual duplicate topic names within the same subject
-- 🚨 Any results here indicate duplicate scraping runs
SELECT 
  eb.code as exam_board,
  ebs.subject_name,
  ct.topic_name,
  ct.topic_level,
  COUNT(*) as duplicate_count,
  STRING_AGG(ct.id::text, ', ') as duplicate_ids
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
GROUP BY eb.code, ebs.subject_name, ct.topic_name, ct.topic_level
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, eb.code, ebs.subject_name
LIMIT 50;

-- ================================================================
-- QUERY 5: AQA Accounting Deep Dive (The Known Problem)
-- ================================================================
-- Let's specifically look at AQA Accounting to see the issue
SELECT 
  'AQA Accounting Analysis' as analysis,
  COUNT(*) as total_topics,
  COUNT(DISTINCT topic_name) as unique_topic_names,
  COUNT(*) - COUNT(DISTINCT topic_name) as duplicate_topic_names,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as level_1_count,
  COUNT(CASE WHEN topic_level = 2 THEN 1 END) as level_2_count,
  COUNT(CASE WHEN topic_level = 3 THEN 1 END) as level_3_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name ILIKE '%accounting%';

-- Show sample of AQA Accounting topics
SELECT 
  ct.topic_level,
  ct.topic_name,
  ct.topic_code,
  ct.sort_order,
  ct.id
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' 
  AND ebs.subject_name ILIKE '%accounting%'
ORDER BY ct.topic_level, ct.sort_order
LIMIT 100;

-- ================================================================
-- QUERY 6: Data Quality by Board and Qualification Type
-- ================================================================
-- Shows breakdown of A-Level vs GCSE for each board
SELECT 
  eb.code as exam_board,
  qt.code as qual_type,
  COUNT(DISTINCT ebs.id) as subject_count,
  COUNT(ct.id) as total_topics,
  CASE 
    WHEN COUNT(ct.id) = 0 THEN '❌ NO DATA'
    WHEN COUNT(ct.id) < 100 THEN '⚠️ MINIMAL'
    WHEN COUNT(ct.id) < 1000 THEN '✅ SOME DATA'
    WHEN COUNT(ct.id) < 3000 THEN '✅ GOOD DATA'
    ELSE '✅ COMPREHENSIVE'
  END as data_quality
FROM exam_boards eb
CROSS JOIN qualification_types qt
LEFT JOIN exam_board_subjects ebs ON 
  ebs.exam_board_id = eb.id 
  AND ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
GROUP BY eb.code, qt.code
ORDER BY eb.code, qt.code;

-- ================================================================
-- QUERY 7: Sample Topics from Each Board (Quick Visual Check)
-- ================================================================
-- Shows 5 topics from each board so you can see data quality
WITH board_samples AS (
  SELECT 
    eb.code as exam_board,
    ebs.subject_name,
    ct.topic_name,
    ct.topic_level,
    ROW_NUMBER() OVER (PARTITION BY eb.code ORDER BY ebs.subject_name, ct.topic_level, ct.sort_order) as rn
  FROM exam_boards eb
  JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id
  JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
  WHERE ct.topic_level = 1  -- Just show top-level topics
)
SELECT 
  exam_board,
  subject_name,
  topic_name
FROM board_samples
WHERE rn <= 5
ORDER BY exam_board, rn;

-- ================================================================
-- QUERY 8: Check for Orphaned Topics (No Subject Link)
-- ================================================================
-- Should return 0 rows if data integrity is good
SELECT 
  ct.id,
  ct.topic_name,
  ct.exam_board_subject_id,
  ct.topic_level
FROM curriculum_topics ct
LEFT JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
WHERE ebs.id IS NULL
LIMIT 20;

-- ================================================================
-- QUERY 9: User Impact Analysis
-- ================================================================
-- Shows which users have selected topics from which boards
-- This tells us which boards we MUST NOT break
SELECT 
  eb.code as exam_board,
  COUNT(DISTINCT ut.user_id) as affected_users,
  COUNT(ut.id) as total_user_topic_selections,
  CASE 
    WHEN COUNT(DISTINCT ut.user_id) > 10 THEN '🚨 HIGH IMPACT - Many users'
    WHEN COUNT(DISTINCT ut.user_id) > 0 THEN '⚠️ MEDIUM IMPACT - Some users'
    ELSE '✅ NO IMPACT - No users'
  END as migration_risk
FROM exam_boards eb
JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id
JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
LEFT JOIN user_topics ut ON ut.topic_id = ct.id
GROUP BY eb.code
ORDER BY COUNT(DISTINCT ut.user_id) DESC;

-- ================================================================
-- QUERY 10: Check if Staging Schemas Already Exist
-- ================================================================
-- Checks if we already have staging schemas from previous work
SELECT 
  schema_name,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE schema_name LIKE 'staging_%' OR schema_name = 'public'
GROUP BY schema_name
ORDER BY schema_name;

-- Also check for the AQA staging tables specifically
SELECT 
  table_name,
  'Exists' as status
FROM information_schema.tables
WHERE table_name LIKE 'aqa_%'
  AND table_schema = 'public'
ORDER BY table_name;

-- ================================================================
-- QUERY 11: Recent Scraping Activity (if timestamps exist)
-- ================================================================
-- Check if there are any timestamp columns we can use
SELECT 
  column_name,
  data_type,
  table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('curriculum_topics', 'exam_board_subjects')
  AND (column_name LIKE '%created%' OR column_name LIKE '%updated%' OR column_name LIKE '%scraped%')
ORDER BY table_name, column_name;

-- ================================================================
-- QUERY 12: Specific Board Checks (Run for boards you care about)
-- ================================================================

-- AQA A-Level Biology Check (Should have 3.1-3.7 top-level topics = 7 topics)
SELECT 
  'AQA Biology A-Level' as subject,
  COUNT(*) as total_topics,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as top_level_modules,
  STRING_AGG(DISTINCT CASE WHEN topic_level = 1 THEN topic_name END, ' | ') as top_level_topic_names
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name ILIKE '%biology%'
GROUP BY ebs.id;

-- AQA A-Level Maths Check (Should have sections A-S)
SELECT 
  'AQA Maths A-Level' as subject,
  COUNT(*) as total_topics,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as top_level_modules,
  STRING_AGG(DISTINCT CASE WHEN topic_level = 1 THEN LEFT(topic_name, 50) END, ' | ' ORDER BY LEFT(topic_name, 50)) as top_level_topic_names
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name ILIKE '%math%'
GROUP BY ebs.id;

-- ================================================================
-- INTERPRETATION GUIDE
-- ================================================================
/*
QUERY 1: Overall Health
- Should show 6 exam boards, 3 qual types, ~200-300 subjects, ~20,000-25,000 topics
- If topics much higher, likely duplicates

QUERY 2: Topics Per Board
- AQA should be highest (~7000)
- If any board shows 0, that board has no data

QUERY 3: Excessive Topics 🚨 CRITICAL
- This will show the problem subjects
- If AQA Accounting shows 300+, that confirms the duplicate issue
- Any subject with 300+ needs cleanup

QUERY 4: Duplicate Detection
- Should ideally return 0 rows
- Any results = duplicate scraping runs accumulated

QUERY 5: AQA Accounting
- Normal would be 40-80 topics
- If showing 300+, confirms the accumulation problem

QUERY 6: Data Quality by Board
- Shows which boards are well-covered vs poor
- Expected: AQA/OCR/Edexcel = GOOD, CCEA/WJEC/SQA = MINIMAL

QUERY 9: User Impact
- Shows how many users will be affected by data changes
- If many users on a board, must be extra careful with migration

QUERY 10: Staging Schemas
- If aqa_subjects, aqa_topics etc already exist, we're partly set up
- If not, we need to create them

QUERY 12: Specific Checks
- Biology should have 7 top-level topics (3.1-3.7)
- If different, data doesn't match official spec
*/

