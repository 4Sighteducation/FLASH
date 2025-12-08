-- Check if Psychology A-Level OCR has AI metadata

-- 1. Find the exact subject name
SELECT 
  id,
  subject_name,
  subject_code,
  exam_board_id
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE ebs.subject_name ILIKE '%psychology%'
  AND eb.code = 'OCR';

-- 2. Check if it has curriculum topics
SELECT COUNT(*) as topic_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE ebs.subject_name ILIKE '%psychology%'
  AND eb.code = 'OCR';

-- 3. Check if it has AI metadata (embeddings)
SELECT COUNT(*) as metadata_count
FROM topic_ai_metadata tam
WHERE tam.subject_name ILIKE '%psychology%'
  AND tam.exam_board = 'OCR';

-- 4. Search for "memory" topics
SELECT 
  topic_name,
  plain_english_summary,
  exam_importance
FROM topic_ai_metadata
WHERE subject_name ILIKE '%psychology%'
  AND topic_name ILIKE '%memory%'
LIMIT 5;
