-- STEP 2: CLEAN AND TRANSFORM DATA
-- Run this after importing the CSV into topics_import_temp table

-- 2.1 Standardize exam boards and exam types
UPDATE topics_import_temp 
SET 
    "Exam Board" = CASE
        WHEN UPPER(TRIM("Exam Board")) = 'EDEXCEL' THEN 'EDEXCEL'
        ELSE UPPER(TRIM("Exam Board"))
    END,
    "Exam Type" = CASE 
        WHEN UPPER(TRIM("Exam Type")) = 'A-LEVEL' THEN 'A_LEVEL'
        WHEN UPPER(TRIM("Exam Type")) = 'A LEVEL' THEN 'A_LEVEL'
        WHEN UPPER(TRIM("Exam Type")) = 'AS-LEVEL' THEN 'AS_LEVEL'
        WHEN UPPER(TRIM("Exam Type")) = 'AS LEVEL' THEN 'AS_LEVEL'
        WHEN UPPER(TRIM("Exam Type")) = 'IGCSE' THEN 'IGCSE'
        WHEN UPPER(TRIM("Exam Type")) = 'GCSE' THEN 'GCSE'
        ELSE UPPER(REPLACE(TRIM("Exam Type"), ' ', '_'))
    END,
    "Subject" = TRIM("Subject"),
    "Module" = TRIM("Module"),
    "Topic" = TRIM("Topic"),
    "Sub Topic" = TRIM("Sub Topic");

-- 2.2 Remove any rows with null subjects
DELETE FROM topics_import_temp 
WHERE "Subject" IS NULL OR "Subject" = '';

-- 2.3 Check what exam boards and types we have
SELECT 
    "Exam Board", 
    "Exam Type",
    COUNT(*) as record_count
FROM topics_import_temp 
GROUP BY "Exam Board", "Exam Type"
ORDER BY "Exam Board", "Exam Type";

-- 2.4 Check unique subjects per exam board and type
SELECT 
    "Exam Board",
    "Exam Type",
    COUNT(DISTINCT "Subject") as unique_subjects
FROM topics_import_temp 
GROUP BY "Exam Board", "Exam Type"
ORDER BY "Exam Board", "Exam Type";

-- 2.5 Show sample data
SELECT * FROM topics_import_temp LIMIT 10; 