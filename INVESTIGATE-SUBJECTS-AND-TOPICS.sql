-- Investigation: Subjects and Popular Topics
-- Purpose: Understand what subjects exist and which topics are most important

-- 1. GET ALL UNIQUE SUBJECTS
-- This will show you every subject in the curriculum
SELECT DISTINCT 
  subject_name,
  qualification_level,
  COUNT(*) as topic_count
FROM curriculum_topics
GROUP BY subject_name, qualification_level
ORDER BY subject_name, qualification_level;

-- 2. GET TOP TOPICS PER SUBJECT (Example: Biology GCSE)
-- This shows the most important topics based on exam_importance
SELECT 
  topic_name,
  topic_level,
  exam_importance,
  difficulty_band,
  plain_english_summary
FROM curriculum_topics
WHERE subject_name = 'Biology'
  AND qualification_level = 'GCSE'
  AND topic_level >= 3  -- Specific enough to be useful
  AND topic_level <= 4  -- Not too deep
  AND exam_importance > 0  -- Only topics marked as important
ORDER BY exam_importance DESC
LIMIT 10;

-- 3. GET POPULAR TOPICS BASED ON USER FLASHCARD CREATION
-- This shows which topics users actually create cards for
SELECT 
  ct.topic_name,
  ct.exam_importance,
  COUNT(DISTINCT f.id) as flashcard_count,
  COUNT(DISTINCT f.user_id) as user_count
FROM curriculum_topics ct
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ct.subject_name = 'Biology'
  AND ct.qualification_level = 'GCSE'
  AND ct.topic_level >= 3
  AND ct.topic_level <= 4
GROUP BY ct.topic_id, ct.topic_name, ct.exam_importance
HAVING COUNT(DISTINCT f.id) > 0  -- Only topics with cards
ORDER BY flashcard_count DESC, ct.exam_importance DESC
LIMIT 10;

-- 4. COMBINED SMART RANKING
-- Best topics based on BOTH importance AND user popularity
SELECT 
  ct.topic_name,
  ct.topic_level,
  ct.exam_importance,
  COUNT(DISTINCT f.id) as flashcard_count,
  -- Smart score: 70% exam importance + 30% popularity
  (ct.exam_importance * 0.7 + (COUNT(DISTINCT f.id)::float / NULLIF((
    SELECT MAX(card_count) 
    FROM (
      SELECT COUNT(*) as card_count 
      FROM flashcards 
      GROUP BY topic_id
    ) sub
  ), 0)) * 0.3) as smart_score
FROM curriculum_topics ct
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ct.subject_name = 'Biology'
  AND ct.qualification_level = 'GCSE'
  AND ct.topic_level >= 3
  AND ct.topic_level <= 4
  AND ct.exam_importance > 0
GROUP BY ct.topic_id, ct.topic_name, ct.topic_level, ct.exam_importance
ORDER BY smart_score DESC
LIMIT 4;

-- 5. FALLBACK: SIMPLE HIGH-IMPORTANCE TOPICS
-- Use this if no flashcards exist yet for a subject
SELECT 
  topic_name,
  exam_importance,
  difficulty_band
FROM curriculum_topics
WHERE subject_name = 'Biology'
  AND qualification_level = 'GCSE'
  AND topic_level = 3  -- Just level 3 for consistency
  AND exam_importance >= 0.7  -- High importance only
ORDER BY exam_importance DESC
LIMIT 4;
