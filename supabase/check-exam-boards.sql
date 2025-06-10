-- Check existing exam boards in the database
SELECT code, full_name 
FROM exam_boards 
WHERE code IN ('AQA', 'EDEXCEL', 'OCR', 'CCEA', 'SQA', 'WJEC')
ORDER BY code;

-- Check if any exam boards in the import don't match
SELECT DISTINCT "Exam Board", COUNT(*) as records
FROM topics_import_temp
WHERE "Exam Board" NOT IN (SELECT code FROM exam_boards)
GROUP BY "Exam Board"; 