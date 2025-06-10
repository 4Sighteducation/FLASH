-- STEP 3: POPULATE EXAM_BOARD_SUBJECTS
-- This creates all the unique subject entries for each exam board and qualification type

-- 3.1 Insert unique exam board subjects
INSERT INTO exam_board_subjects (exam_board_id, qualification_type_id, subject_name, subject_code, is_current)
SELECT DISTINCT 
    eb.id as exam_board_id,
    qt.id as qualification_type_id,
    ti."Subject" as subject_name,
    ti."Subject" as subject_code, -- Using subject name as code for now
    true as is_current
FROM topics_import_temp ti
JOIN exam_boards eb ON eb.code = ti."Exam Board"
JOIN qualification_types qt ON qt.code = ti."Exam Type"
WHERE ti."Subject" IS NOT NULL 
  AND ti."Subject" != ''
ON CONFLICT (exam_board_id, qualification_type_id, subject_code) DO NOTHING;

-- 3.2 Verify the import
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(DISTINCT ebs.id) as subject_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY eb.code, qt.code
ORDER BY eb.code, qt.code;

-- 3.3 Show total subjects created
SELECT 
    'Total exam_board_subjects created' as description,
    COUNT(*) as count 
FROM exam_board_subjects; 