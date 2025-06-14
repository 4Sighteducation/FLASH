-- SQL script to strip exam type suffixes from subject names
-- This will remove patterns like "(A-Level)", "(GCSE)", etc. from the subject_name field

-- First, let's see what we're dealing with
SELECT DISTINCT subject_name 
FROM exam_board_subjects 
WHERE subject_name LIKE '%(%' 
ORDER BY subject_name;

-- Update the subject names to remove the exam type in parentheses
UPDATE exam_board_subjects
SET subject_name = TRIM(REGEXP_REPLACE(subject_name, '\s*\([^)]*\)\s*$', '', 'g'))
WHERE subject_name LIKE '%(%';

-- Verify the changes
SELECT DISTINCT subject_name 
FROM exam_board_subjects 
ORDER BY subject_name;

-- Also update any flashcards that might have the old subject names
UPDATE flashcards
SET subject_name = TRIM(REGEXP_REPLACE(subject_name, '\s*\([^)]*\)\s*$', '', 'g'))
WHERE subject_name LIKE '%(%';

-- Update any topics that might have the exam type in their names
UPDATE curriculum_topics
SET topic_name = TRIM(REGEXP_REPLACE(topic_name, '\s*\([^)]*\)\s*$', '', 'g'))
WHERE topic_name LIKE '%(%'; 