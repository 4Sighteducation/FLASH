-- COMPLETE RESET - Start Fresh from CSV Import
-- This cleans up everything we've done and starts over

-- STEP 1: Clean up all the work we've done
DROP TABLE IF EXISTS cleaned_topics CASCADE;
DELETE FROM curriculum_topics;
DELETE FROM user_topics;
DELETE FROM flashcards;

-- STEP 2: Verify we have the original import
SELECT COUNT(*) as csv_rows_available FROM topics_import_temp;

-- STEP 3: Create cleaned_topics with FIXED data
CREATE TABLE cleaned_topics AS
SELECT DISTINCT
    -- Standardize exam board codes
    UPPER("Exam Board") as exam_board,
    
    -- Convert exam type to match our codes  
    CASE 
        WHEN UPPER("Exam Type") LIKE '%A%LEVEL%' OR UPPER("Exam Type") = 'A-LEVEL' THEN 'A_LEVEL'
        WHEN UPPER("Exam Type") = 'GCSE' THEN 'GCSE'
        ELSE UPPER("Exam Type")
    END as exam_type,
    
    -- Clean subject names
    TRIM("Subject") as subject_name,
    
    -- Clean module/topic/subtopic names
    TRIM("Module") as module_name,
    TRIM("Topic") as topic_name,
    TRIM("Sub Topic") as sub_topic_name
    
FROM topics_import_temp
WHERE "Subject" IS NOT NULL 
  AND "Subject" != ''
  AND "Exam Board" IS NOT NULL
  AND "Exam Type" IS NOT NULL;

-- STEP 4: Check what we have
SELECT 
    exam_board,
    exam_type,
    COUNT(*) as row_count,
    COUNT(DISTINCT subject_name) as unique_subjects
FROM cleaned_topics
GROUP BY exam_board, exam_type
ORDER BY exam_board, exam_type;

-- STEP 5: Check total
SELECT COUNT(*) as total_cleaned_rows FROM cleaned_topics; 