-- CHECK IF TOPICS ARE PROPERLY LINKED TO SUBJECTS

-- 1. Check a specific example: Do AQA A-Level Mathematics topics exist?
SELECT 
    'AQA A-Level Mathematics check' as test,
    ebs.id as exam_board_subject_id,
    ebs.subject_name,
    COUNT(ct.id) as topic_count
FROM exam_board_subjects ebs
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'AQA' 
  AND qt.code = 'A_LEVEL'
  AND ebs.subject_name = 'Mathematics (A-Level)'
GROUP BY ebs.id, ebs.subject_name;

-- 2. Check ALL subjects - which ones have topics and which don't?
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name,
    ebs.id as exam_board_subject_id,
    COUNT(ct.id) as topic_count
FROM exam_board_subjects ebs
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code, qt.code, ebs.subject_name, ebs.id
HAVING COUNT(ct.id) = 0
ORDER BY eb.code, ebs.subject_name
LIMIT 20;

-- 3. Show me the actual exam_board_subject_ids in curriculum_topics
SELECT DISTINCT
    ct.exam_board_subject_id,
    eb.code as exam_board,
    qt.code as qualification_type,
    ebs.subject_name
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
ORDER BY eb.code, qt.code, ebs.subject_name
LIMIT 20;

-- 4. Check if there's a mismatch in subject names
SELECT 
    'Subject name mismatches' as check,
    ct.subject_name as cleaned_topics_subject,
    ebs.subject_name as exam_board_subjects_subject,
    COUNT(*) as count
FROM cleaned_topics ct
LEFT JOIN exam_board_subjects ebs ON 
    ebs.subject_name = ct.subject_name
    AND EXISTS (
        SELECT 1 FROM exam_boards eb 
        WHERE eb.id = ebs.exam_board_id 
        AND eb.code = ct.exam_board
    )
    AND EXISTS (
        SELECT 1 FROM qualification_types qt 
        WHERE qt.id = ebs.qualification_type_id 
        AND qt.code = ct.exam_type
    )
WHERE ebs.id IS NULL
  AND ct.exam_type = 'A_LEVEL'
GROUP BY ct.subject_name, ebs.subject_name
LIMIT 20;

-- 5. Let's trace through the app flow - what should happen:
-- User selects: A-Level → AQA → Mathematics (A-Level)
-- App should query something like:
SELECT 
    ct.id,
    ct.topic_name,
    ct.topic_level,
    ct.parent_topic_id
FROM curriculum_topics ct
WHERE ct.exam_board_subject_id = (
    SELECT ebs.id 
    FROM exam_board_subjects ebs
    JOIN exam_boards eb ON ebs.exam_board_id = eb.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE eb.code = 'AQA' 
      AND qt.code = 'A_LEVEL'
      AND ebs.subject_name = 'Mathematics (A-Level)'
)
AND ct.topic_level = 1  -- Start with modules
ORDER BY ct.sort_order; 