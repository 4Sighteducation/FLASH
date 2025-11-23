-- ========================================
-- CLEAN UPDATE STRATEGY FOR RE-SCRAPED SUBJECTS
-- ========================================
-- Use this when you've improved/fixed a subject's scraping

-- STEP 1: Remove old bad data (replace 'Classical Greek' with your subject)
-- ========================================

-- First, store what we're about to delete (for safety)
CREATE TEMP TABLE backup_topics AS
SELECT ct.*, tam.embedding IS NOT NULL as had_embedding
FROM curriculum_topics ct
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE ct.exam_board_subject_id IN (
  SELECT id FROM exam_board_subjects 
  WHERE subject_name = 'Classical Greek'  -- CHANGE THIS
    AND exam_board_id = (SELECT id FROM exam_boards WHERE code = 'OCR')  -- AND THIS
);

-- Check what will be deleted
SELECT 
  COUNT(*) as total_topics,
  SUM(CASE WHEN had_embedding THEN 1 ELSE 0 END) as topics_with_embeddings
FROM backup_topics;

-- Delete AI metadata first
DELETE FROM topic_ai_metadata 
WHERE topic_id IN (SELECT id FROM backup_topics);

-- Delete the topics
DELETE FROM curriculum_topics 
WHERE id IN (SELECT id FROM backup_topics);

-- STEP 2: Run your migration for the improved data
-- ========================================
-- Run your migrate-all-staging-to-production-FIXED.sql

-- STEP 3: Generate embeddings for the new topics
-- ========================================
-- npm run generate
-- It will only process the new topics

-- STEP 4: Verify the update
-- ========================================
SELECT 
  'Updated Subject Check' as check_type,
  ebs.subject_name,
  COUNT(ct.id) as total_topics,
  COUNT(tam.id) as topics_with_ai
FROM exam_board_subjects ebs
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE ebs.subject_name = 'Classical Greek'  -- CHANGE THIS
GROUP BY ebs.subject_name;


