-- Investigation: Subjects and Popular Topics
-- Purpose: Understand what subjects exist and which topics are most important

-- 0. DISCOVER SCHEMA FIRST
-- Run this to see what columns exist in curriculum_topics
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'curriculum_topics'
ORDER BY ordinal_position;

-- 1. GET ALL UNIQUE SUBJECTS (FIXED - uses exam_board_subject_id join)
-- This will show you every subject in the curriculum
SELECT DISTINCT 
  ebs.subject_name,
  ebs.qualification_level,
  ebs.exam_board,
  COUNT(ct.topic_id) as topic_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
GROUP BY ebs.subject_name, ebs.qualification_level, ebs.exam_board
ORDER BY ebs.subject_name, ebs.qualification_level;

-- 2. GET TOP TOPICS PER SUBJECT (Example: Biology GCSE) - FIXED
-- This shows topics at the right level
SELECT 
  ct.topic_name,
  ct.topic_level,
  ct.topic_id,
  ebs.subject_name,
  ebs.qualification_level,
  COUNT(f.id) as existing_cards
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ebs.subject_name = 'Biology'
  AND ebs.qualification_level = 'GCSE'
  AND ct.topic_level >= 3  -- Specific enough to be useful
  AND ct.topic_level <= 4  -- Not too deep
  AND ct.topic_name IS NOT NULL
GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ebs.subject_name, ebs.qualification_level
ORDER BY existing_cards DESC, ct.topic_name
LIMIT 10;

-- 3. GET POPULAR TOPICS BASED ON USER FLASHCARD CREATION - FIXED
-- This shows which topics users actually create cards for
SELECT 
  ct.topic_name,
  ct.topic_level,
  ebs.subject_name,
  COUNT(DISTINCT f.id) as flashcard_count,
  COUNT(DISTINCT f.user_id) as user_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ebs.subject_name = 'Biology'
  AND ebs.qualification_level = 'GCSE'
  AND ct.topic_level >= 3
  AND ct.topic_level <= 4
GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ebs.subject_name
HAVING COUNT(DISTINCT f.id) > 0  -- Only topics with cards
ORDER BY flashcard_count DESC
LIMIT 10;

-- 4. COMBINED SMART RANKING - FIXED
-- Best topics based on BOTH importance AND user popularity
SELECT 
  ct.topic_name,
  ct.topic_level,
  ebs.subject_name,
  COUNT(DISTINCT f.id) as flashcard_count,
  -- Smart score: Just use popularity for now (will fix once we know schema)
  COUNT(DISTINCT f.id) as smart_score
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ebs.subject_name = 'Biology'
  AND ebs.qualification_level = 'GCSE'
  AND ct.topic_level >= 3
  AND ct.topic_level <= 4
GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ebs.subject_name
ORDER BY smart_score DESC
LIMIT 4;

-- 5. FALLBACK: TOPICS WITH MOST FLASHCARDS
-- Use this if we don't have importance scores
SELECT 
  ct.topic_name,
  ct.topic_level,
  ebs.subject_name,
  COUNT(DISTINCT f.id) as flashcard_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ebs.id = ct.exam_board_subject_id
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ebs.subject_name = 'Biology'
  AND ebs.qualification_level = 'GCSE'
  AND ct.topic_level = 3
GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ebs.subject_name
ORDER BY flashcard_count DESC
LIMIT 4;
