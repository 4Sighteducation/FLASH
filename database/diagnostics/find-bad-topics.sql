-- ========================================
-- FIND SUSPICIOUS/BAD TOPICS
-- ========================================
-- Run this to identify topics that shouldn't be topics

-- 1. Find topics with suspicious names (likely metadata not content)
SELECT 
  'Suspicious Topic Names' as check_type,
  eb.code as exam_board,
  ebs.subject_name,
  ct.topic_name,
  ct.topic_level,
  COUNT(*) OVER (PARTITION BY ebs.subject_name) as total_in_subject
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE 
  -- Common non-topic patterns
  ct.topic_name ILIKE '%assessment%'
  OR ct.topic_name ILIKE '%specification%'
  OR ct.topic_name ILIKE '%mark scheme%'
  OR ct.topic_name ILIKE '%grade%boundary%'
  OR ct.topic_name ILIKE '%exam%board%'
  OR ct.topic_name ILIKE '%teaching%from%'
  OR ct.topic_name ILIKE '%first%exam%'
  OR ct.topic_name ILIKE '%forms of%'
  OR ct.topic_name ILIKE '%weighting%'
  OR ct.topic_name ILIKE '%duration%'
  OR ct.topic_name ILIKE '%% of %'  -- Like "40% of total"
  OR ct.topic_name ~ '^\d+%'  -- Starts with percentage
  OR ct.topic_name ~ '^\d+ marks?$'  -- Just "20 marks"
  OR LENGTH(ct.topic_name) < 3  -- Too short
ORDER BY eb.code, ebs.subject_name, ct.topic_name;

-- 2. Find subjects with suspiciously few topics (likely bad scrape)
SELECT 
  'Shallow Subjects' as check_type,
  eb.code as exam_board,
  qt.code as qualification,
  ebs.subject_name,
  COUNT(DISTINCT ct.id) as topic_count,
  MAX(ct.topic_level) as max_depth
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
GROUP BY eb.code, qt.code, ebs.subject_name
HAVING COUNT(DISTINCT ct.id) < 20  -- Suspiciously few topics
   OR MAX(ct.topic_level) <= 1      -- No depth
ORDER BY topic_count ASC;

-- 3. Find duplicate topic names within same subject (shouldn't happen)
SELECT 
  'Duplicate Topics' as check_type,
  eb.code as exam_board,
  ebs.subject_name,
  ct.topic_name,
  ct.topic_level,
  COUNT(*) as duplicate_count,
  STRING_AGG(ct.topic_code, ', ') as topic_codes
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
GROUP BY eb.code, ebs.subject_name, ct.topic_name, ct.topic_level
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, eb.code, ebs.subject_name;

-- 4. Summary of potentially bad data
WITH bad_topics AS (
  SELECT ct.id
  FROM curriculum_topics ct
  WHERE 
    ct.topic_name ILIKE '%assessment%'
    OR ct.topic_name ILIKE '%specification%'
    OR ct.topic_name ILIKE '%mark scheme%'
    OR LENGTH(ct.topic_name) < 3
)
SELECT 
  'Summary' as check_type,
  COUNT(DISTINCT bt.id) as bad_topics_count,
  COUNT(DISTINCT tam.topic_id) as bad_topics_with_embeddings,
  ROUND(COUNT(DISTINCT tam.topic_id)::numeric * 100.0 / NULLIF(COUNT(DISTINCT bt.id), 0), 1) as pct_with_embeddings
FROM bad_topics bt
LEFT JOIN topic_ai_metadata tam ON bt.id = tam.topic_id;


