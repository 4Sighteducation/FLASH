-- Investigation: Subjects and Popular Topics
-- Purpose: Understand what subjects exist and which topics are most important

-- 0A. FIND ALL TABLES IN DATABASE
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 0B. FIND TABLES WITH exam_importance COLUMN
SELECT table_name, column_name
FROM information_schema.columns 
WHERE column_name LIKE '%importance%'
  OR column_name LIKE '%exam%'
  OR table_name LIKE '%vector%'
  OR table_name LIKE '%search%'
ORDER BY table_name;

-- 0C. DISCOVER SCHEMA - curriculum_topics
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'curriculum_topics'
ORDER BY ordinal_position;

-- 0D. DISCOVER SCHEMA - topic_ai_metadata (HAS exam_importance!)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'topic_ai_metadata'
ORDER BY ordinal_position;

-- 0E. DISCOVER SCHEMA - exam_board_subjects
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'exam_board_subjects'
ORDER BY ordinal_position;

-- 0F. CHECK WHAT DATA EXISTS IN topic_ai_metadata
-- See if Biology GCSE has any data at all
SELECT 
  subject_name,
  qualification_level,
  topic_level,
  is_active,
  COUNT(*) as count
FROM topic_ai_metadata
WHERE subject_name LIKE '%Biology%'
GROUP BY subject_name, qualification_level, topic_level, is_active
ORDER BY subject_name, qualification_level, topic_level;

-- 0G. CHECK exam_importance VALUES
-- See if exam_importance is populated
SELECT 
  subject_name,
  qualification_level,
  COUNT(*) as total,
  COUNT(CASE WHEN exam_importance > 0 THEN 1 END) as with_importance,
  AVG(exam_importance) as avg_importance,
  MAX(exam_importance) as max_importance
FROM topic_ai_metadata
GROUP BY subject_name, qualification_level
ORDER BY subject_name, qualification_level;

-- 1. GET ALL UNIQUE SUBJECTS (SIMPLE - from topic_ai_metadata!)
-- topic_ai_metadata has subject_name AND qualification_level built-in!
SELECT DISTINCT 
  subject_name,
  qualification_level,
  exam_board,
  COUNT(*) as topic_count
FROM topic_ai_metadata
WHERE is_active = true
GROUP BY subject_name, qualification_level, exam_board
ORDER BY subject_name, qualification_level;

-- 2. GET TOP TOPICS DIRECTLY FROM AI METADATA (SIMPLEST!)
-- topic_ai_metadata has everything we need in one table!
SELECT 
  ai.topic_id,
  ct.topic_name,
  ai.subject_name,
  ai.qualification_level,
  ai.topic_level,
  ai.exam_importance,
  ai.difficulty_band,
  ai.plain_english_summary,
  COUNT(f.id) as existing_cards
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
WHERE ai.subject_name = 'Biology'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 3
  AND ai.topic_level <= 4
  AND ai.is_active = true
  AND ai.exam_importance > 0
GROUP BY ai.topic_id, ct.topic_name, ai.subject_name, ai.qualification_level, ai.topic_level, ai.exam_importance, ai.difficulty_band, ai.plain_english_summary
ORDER BY ai.exam_importance DESC, existing_cards DESC
LIMIT 10;

-- 3. GET POPULAR TOPICS (SIMPLIFIED)
-- Shows which topics users create cards for
SELECT 
  ct.topic_name,
  ai.topic_level,
  ai.subject_name,
  ai.exam_importance,
  COUNT(DISTINCT f.id) as flashcard_count,
  COUNT(DISTINCT f.user_id) as user_count
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
WHERE ai.subject_name = 'Biology'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 3
  AND ai.topic_level <= 4
  AND ai.is_active = true
GROUP BY ai.topic_id, ct.topic_name, ai.topic_level, ai.subject_name, ai.exam_importance
HAVING COUNT(DISTINCT f.id) > 0
ORDER BY flashcard_count DESC
LIMIT 10;

-- 4. SMART RANKING - SIMPLIFIED (No complex joins needed!)
-- Best topics from topic_ai_metadata with smart scoring
SELECT 
  ct.topic_name,
  ai.topic_level,
  ai.subject_name,
  ai.exam_importance,
  COUNT(DISTINCT f.id) as flashcard_count,
  -- Smart score: 70% importance + 30% popularity
  COALESCE(ai.exam_importance, 0) * 0.7 + 
  (COUNT(DISTINCT f.id)::NUMERIC / NULLIF((SELECT MAX(cnt) FROM (
    SELECT COUNT(*) as cnt FROM flashcards GROUP BY topic_id
  ) sub), 0)) * 0.3 as smart_score
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
WHERE ai.subject_name = 'Biology'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 3
  AND ai.topic_level <= 4
  AND ai.is_active = true
  AND ai.exam_importance > 0
GROUP BY ai.topic_id, ct.topic_name, ai.topic_level, ai.subject_name, ai.exam_importance
ORDER BY smart_score DESC
LIMIT 4;

-- 5A. DIAGNOSTIC - Just AI metadata (no join, no filters except subject)
SELECT 
  topic_id,
  subject_name,
  qualification_level,
  topic_level,
  exam_importance,
  is_active
FROM topic_ai_metadata
WHERE subject_name = 'Biology (GCSE)'
  AND qualification_level = 'GCSE'
  AND topic_level >= 2
  AND topic_level <= 3
LIMIT 10;

-- 5B. DIAGNOSTIC - Add curriculum_topics join
SELECT 
  ai.topic_id,
  ct.topic_name,
  ai.exam_importance,
  ai.topic_level
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
WHERE ai.subject_name = 'Biology (GCSE)'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 2
  AND ai.topic_level <= 3
LIMIT 10;

-- 5C. DIAGNOSTIC - Add is_active filter
SELECT 
  ai.topic_id,
  ct.topic_name,
  ai.exam_importance,
  ai.is_active
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
WHERE ai.subject_name = 'Biology (GCSE)'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 2
  AND ai.topic_level <= 3
  AND ai.is_active = true
LIMIT 10;

-- 5D. DIAGNOSTIC - Add exam_importance filter
SELECT 
  ai.topic_id,
  ct.topic_name,
  ai.exam_importance
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
WHERE ai.subject_name = 'Biology (GCSE)'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 2
  AND ai.topic_level <= 3
  AND ai.is_active = true
  AND ai.exam_importance > 0
LIMIT 10;

-- 5. FINAL SMART SUGGESTIONS QUERY - THE ONE WE'LL USE!
-- Only run this AFTER 5A-5D work!
SELECT 
  ct.topic_name,
  ai.topic_level,
  ai.exam_importance,
  COUNT(DISTINCT f.id) as flashcard_count,
  ROUND(
    (COALESCE(ai.exam_importance, 0) * 0.7 + 
     (COUNT(DISTINCT f.id)::NUMERIC / NULLIF((
       SELECT MAX(cnt) FROM (
         SELECT COUNT(*) as cnt FROM flashcards GROUP BY topic_id
       ) sub
     ), 0)) * 0.3)::NUMERIC, 
    4
  ) as smart_score
FROM topic_ai_metadata ai
JOIN curriculum_topics ct ON ct.id = ai.topic_id
LEFT JOIN flashcards f ON f.topic_id = ai.topic_id
WHERE ai.subject_name = 'Biology (GCSE)'
  AND ai.qualification_level = 'GCSE'
  AND ai.topic_level >= 2
  AND ai.topic_level <= 3
  AND ai.is_active = true
  AND ai.exam_importance > 0
GROUP BY ai.topic_id, ct.topic_name, ai.topic_level, ai.exam_importance
ORDER BY smart_score DESC
LIMIT 4;
