-- Script 2: Clean and transform the imported data
-- Modified to use topics_import_temp table

-- Create the cleaned topics table
DROP TABLE IF EXISTS cleaned_topics;
CREATE TABLE cleaned_topics AS
WITH standardized_data AS (
    SELECT 
        -- Standardize exam board names
        CASE 
            WHEN UPPER("Exam Board") IN ('AQA', 'EDEXCEL', 'OCR', 'CCEA', 'SQA', 'WJEC') 
            THEN UPPER("Exam Board")
            ELSE "Exam Board"
        END as exam_board,
        
        -- Convert exam type to match our codes
        CASE 
            WHEN UPPER("Exam Type") = 'A-LEVEL' THEN 'A_LEVEL'
            WHEN UPPER("Exam Type") = 'AS-LEVEL' THEN 'AS_LEVEL'
            WHEN UPPER("Exam Type") = 'GCSE' THEN 'GCSE'
            WHEN UPPER("Exam Type") = 'BTEC' THEN 'BTEC'
            WHEN UPPER("Exam Type") = 'IB' THEN 'IB'
            WHEN UPPER("Exam Type") = 'IGCSE' THEN 'IGCSE'
            ELSE UPPER("Exam Type")
        END as exam_type,
        
        TRIM("Subject") as subject_name,
        TRIM("Module") as module_name,
        TRIM("Topic") as topic_name,
        TRIM("Sub Topic") as sub_topic_name
    FROM topics_import_temp
    WHERE "Subject" IS NOT NULL 
    AND "Subject" != ''
)
SELECT DISTINCT * FROM standardized_data;

-- Show summary of cleaned data
SELECT 
    exam_type,
    exam_board,
    COUNT(DISTINCT subject_name) as subject_count,
    COUNT(*) as total_rows
FROM cleaned_topics
GROUP BY exam_type, exam_board
ORDER BY exam_type, exam_board; 