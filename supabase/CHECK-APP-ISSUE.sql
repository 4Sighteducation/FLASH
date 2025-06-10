-- THE ISSUE: Your app doesn't filter by qualification type!

-- 1. When your app fetches subjects, it gets ALL subjects for an exam board
-- This means it might get both A-Level AND GCSE subjects mixed together
SELECT 
    ebs.id,
    ebs.subject_name,
    qt.code as qualification_type,
    eb.code as exam_board
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA'  -- Your app only filters by exam board
  AND ebs.is_current = true
ORDER BY qt.code, ebs.subject_name
LIMIT 20;

-- 2. Your app needs to ALSO filter by qualification_type_id
-- For example, to get only A-Level subjects:
SELECT 
    ebs.id,
    ebs.subject_name,
    qt.code as qualification_type
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA'
  AND qt.code = 'A_LEVEL'  -- This is missing in your app!
  AND ebs.is_current = true
ORDER BY ebs.subject_name;

-- 3. Quick fix to test - add A-Level to Mathematics subject name
-- Check if any subjects are missing the qualification in their name
SELECT 
    ebs.id,
    ebs.subject_name,
    qt.code as qualification_type,
    CASE 
        WHEN ebs.subject_name LIKE '%(A-Level)%' THEN 'Has A-Level in name'
        WHEN ebs.subject_name LIKE '%(GCSE)%' THEN 'Has GCSE in name'
        ELSE 'Missing qualification in name'
    END as name_check
FROM exam_board_subjects ebs
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE ebs.subject_name LIKE '%Mathematics%'
ORDER BY qt.code, ebs.subject_name; 