-- QUICK FIX: Add A-Level subjects for testing
-- Use this if you want to test the app before doing the full import

-- This duplicates existing GCSE subjects as A-Level subjects
INSERT INTO exam_board_subjects (exam_board_id, qualification_type_id, subject_name, subject_code, is_current)
SELECT 
    exam_board_id,
    (SELECT id FROM qualification_types WHERE code = 'A_LEVEL'),
    subject_name,
    subject_name || '_ALEVEL', -- Add suffix to avoid conflicts
    is_current
FROM exam_board_subjects
WHERE qualification_type_id = (SELECT id FROM qualification_types WHERE code = 'GCSE')
ON CONFLICT DO NOTHING;

-- Verify it worked
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(*) as subject_count
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code IN ('GCSE', 'A_LEVEL')
GROUP BY eb.code, qt.code
ORDER BY eb.code, qt.code; 