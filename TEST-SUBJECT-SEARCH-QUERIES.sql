-- Test Queries for New Subject Search Feature
-- Date: December 6, 2025
-- Purpose: Validate subject search with exam board options

-- ============================================
-- 1. TEST: Search subjects by name (e.g., "Physics")
-- ============================================

-- Get all Physics subjects across all exam boards for A-Level
SELECT 
  ebs.id as subject_id,
  ebs.subject_name,
  ebs.subject_code,
  eb.code as exam_board_code,
  eb.full_name as exam_board_name,
  qt.code as qualification_type
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name ILIKE '%physics%'
  AND qt.code = 'A_LEVEL'
  AND ebs.is_current = true
ORDER BY ebs.subject_name, eb.code;

-- Expected output:
-- Physics (A-Level) - AQA
-- Physics (A-Level) - Edexcel  
-- Physics (A-Level) - OCR
-- etc.


-- ============================================
-- 2. TEST: Search subjects with multiple matches
-- ============================================

-- Search for "Biology" - should show all Biology subjects
SELECT 
  ebs.id as subject_id,
  ebs.subject_name,
  eb.code as exam_board,
  qt.code as qualification_level,
  COUNT(ct.id) as topic_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
WHERE ebs.subject_name ILIKE '%biology%'
  AND ebs.is_current = true
GROUP BY ebs.id, ebs.subject_name, eb.code, qt.code
ORDER BY qt.code, eb.code;


-- ============================================
-- 3. TEST: Get all subjects for specific qualification type
-- ============================================

-- Get all subjects available for GCSE across all boards
SELECT DISTINCT
  ebs.subject_name,
  array_agg(DISTINCT eb.code ORDER BY eb.code) as exam_boards,
  COUNT(DISTINCT ebs.id) as board_options
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'GCSE'
  AND ebs.is_current = true
GROUP BY ebs.subject_name
ORDER BY ebs.subject_name;


-- ============================================
-- 4. TEST: Save user's selected subject to user_subjects
-- ============================================

-- Insert a user's subject selection
-- Example: User selects "Physics (A-Level) - Edexcel"
INSERT INTO user_subjects (
  user_id,
  subject_id,
  exam_board
) VALUES (
  'USER_ID_HERE',  -- Replace with actual user.id
  'SUBJECT_ID_FROM_SEARCH',  -- From query #1 results
  'Edexcel'  -- Exam board code
)
ON CONFLICT (user_id, subject_id) DO UPDATE
SET 
  exam_board = EXCLUDED.exam_board,
  updated_at = NOW();

-- Note: This uses UPSERT so if user changes their mind, it updates


-- ============================================
-- 5. TEST: Get user's selected subjects for card creation
-- ============================================

-- Retrieve all subjects a user has selected
SELECT 
  us.id as user_subject_id,
  ebs.subject_name,
  ebs.subject_code,
  us.exam_board,
  eb.full_name as exam_board_full_name,
  qt.code as qualification_level,
  ebs.id as subject_id
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE us.user_id = 'USER_ID_HERE'
ORDER BY ebs.subject_name;


-- ============================================
-- 6. TEST: Format subject name for topic search
-- ============================================

-- When searching topics, we need the formatted subject name
-- e.g., "Biology (GCSE)" not just "Biology"
SELECT 
  ebs.subject_name || ' (' || qt.code || ')' as formatted_subject_name,
  ebs.id as subject_id,
  us.exam_board
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE us.user_id = 'USER_ID_HERE'
  AND us.id = 'USER_SUBJECT_ID_HERE';

-- This returns e.g.: "Biology (GCSE)", "Edexcel"
-- Which is exactly what we need for topic search filters


-- ============================================
-- 7. TEST: Smart topic search with user context
-- ============================================

-- When user creates cards, use their subject metadata for filtering
-- This query prepares the context for vector search

WITH user_context AS (
  SELECT 
    ebs.subject_name || ' (' || qt.code || ')' as subject_name_formatted,
    us.exam_board,
    qt.code as qualification_level
  FROM user_subjects us
  JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
  JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
  WHERE us.id = 'USER_SUBJECT_ID_HERE'
)
SELECT 
  subject_name_formatted,
  exam_board,
  qualification_level
FROM user_context;

-- This context is passed to the match_topics RPC function


-- ============================================
-- 8. TEST: Check for duplicate subject selections
-- ============================================

-- Ensure user hasn't already selected this subject
SELECT 
  us.id,
  ebs.subject_name,
  us.exam_board
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
WHERE us.user_id = 'USER_ID_HERE'
  AND ebs.id = 'SUBJECT_ID_TO_ADD';

-- If this returns rows, subject is already selected


-- ============================================
-- 9. TEST: Get subject with exam board options grouped
-- ============================================

-- For UI display: show subject with all available exam boards
SELECT 
  ebs.subject_name,
  qt.code as qualification_level,
  json_agg(
    json_build_object(
      'subject_id', ebs.id,
      'exam_board_code', eb.code,
      'exam_board_name', eb.full_name,
      'topic_count', (
        SELECT COUNT(*) 
        FROM curriculum_topics ct 
        WHERE ct.exam_board_subject_id = ebs.id
      )
    ) ORDER BY eb.code
  ) as exam_board_options
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name ILIKE '%physics%'
  AND qt.code = 'A_LEVEL'
  AND ebs.is_current = true
GROUP BY ebs.subject_name, qt.code;

-- Returns:
-- {
--   "subject_name": "Physics",
--   "qualification_level": "A_LEVEL",
--   "exam_board_options": [
--     {"subject_id": "123", "exam_board_code": "AQA", "topic_count": 450},
--     {"subject_id": "124", "exam_board_code": "Edexcel", "topic_count": 520},
--     ...
--   ]
-- }


-- ============================================
-- 10. VALIDATION: Check table structure
-- ============================================

-- Verify user_subjects table has correct columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_subjects'
ORDER BY ordinal_position;

-- Expected columns:
-- id, user_id, subject_id, exam_board, created_at, updated_at


-- ============================================
-- 11. TEST: Delete/Switch subject (for metadata management)
-- ============================================

-- If user wants to switch exam board, just delete old and create new
DELETE FROM user_subjects
WHERE user_id = 'USER_ID_HERE'
  AND id = 'USER_SUBJECT_ID_TO_DELETE';

-- Then insert new one with different exam board


-- ============================================
-- NOTES FOR IMPLEMENTATION
-- ============================================

/*
1. SubjectSearchScreen needs:
   - Search input (debounced)
   - Query #9 for displaying subjects with board options
   - Query #4 for saving selections
   - Query #8 for preventing duplicates

2. Card Creation needs:
   - Query #6 to format subject name for search
   - Pass formatted name to match_topics RPC function
   
3. User Profile/Home needs:
   - Query #5 to show user's subjects
   - Delete button uses Query #11

4. Search API endpoint should use Query #7 to get context
*/
