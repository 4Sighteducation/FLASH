-- FIX GCSE IMPORT ISSUE

-- STEP 1: Clean up the bad GCSE import (keep A-Level data)
DELETE FROM curriculum_topics 
WHERE id IN (
    SELECT ct.id 
    FROM curriculum_topics ct
    JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
    JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
    WHERE qt.code = 'GCSE'
);

-- Verify A-Level data is still there
SELECT 
    eb.code as exam_board,
    qt.code as qualification_type,
    COUNT(*) as topic_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL'
GROUP BY eb.code, qt.code
ORDER BY eb.code;

-- STEP 2: FIXED GCSE Import for CCEA
-- Let's be EXTRA careful with the joins

-- 2A: Import GCSE Modules (Level 1) - Fixed version
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id,
    ct.module_name,
    ct.module_name,
    1,
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY ct.module_name)
FROM cleaned_topics ct
INNER JOIN exam_boards eb ON eb.code = ct.exam_board
INNER JOIN qualification_types qt ON qt.code = ct.exam_type
INNER JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = ct.subject_name
WHERE ct.exam_board = 'CCEA' 
  AND ct.exam_type = 'GCSE'
  AND ct.module_name IS NOT NULL 
  AND ct.module_name != ''
  AND NOT EXISTS ( -- Prevent duplicates
      SELECT 1 FROM curriculum_topics existing
      WHERE existing.exam_board_subject_id = ebs.id
        AND existing.topic_name = ct.module_name
        AND existing.topic_level = 1
  );

-- Check module count
SELECT 'CCEA GCSE Modules' as step, COUNT(*) as count 
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE' AND ct.topic_level = 1;

-- 2B: Import GCSE Topics (Level 2) - VERY CAREFUL VERSION
WITH gcse_topics_to_import AS (
    SELECT DISTINCT
        ct.exam_board,
        ct.exam_type,
        ct.subject_name,
        ct.module_name,
        ct.topic_name
    FROM cleaned_topics ct
    WHERE ct.exam_board = 'CCEA' 
      AND ct.exam_type = 'GCSE'
      AND ct.topic_name IS NOT NULL 
      AND ct.topic_name != ''
)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    parent.exam_board_subject_id,
    parent.id,
    gti.topic_name,
    gti.topic_name,
    2,
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY gti.topic_name)
FROM gcse_topics_to_import gti
INNER JOIN exam_boards eb ON eb.code = gti.exam_board
INNER JOIN qualification_types qt ON qt.code = gti.exam_type
INNER JOIN exam_board_subjects ebs ON 
    ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = gti.subject_name
INNER JOIN curriculum_topics parent ON 
    parent.exam_board_subject_id = ebs.id 
    AND parent.topic_name = gti.module_name
    AND parent.topic_level = 1
WHERE NOT EXISTS ( -- Prevent duplicates
    SELECT 1 FROM curriculum_topics existing
    WHERE existing.parent_topic_id = parent.id
      AND existing.topic_name = gti.topic_name
      AND existing.topic_level = 2
);

-- Final check for CCEA GCSE
SELECT 
    'CCEA GCSE After Fix' as status,
    COUNT(*) as total_topics,
    SUM(CASE WHEN topic_level = 1 THEN 1 ELSE 0 END) as modules,
    SUM(CASE WHEN topic_level = 2 THEN 1 ELSE 0 END) as topics,
    SUM(CASE WHEN topic_level = 3 THEN 1 ELSE 0 END) as sub_topics
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE eb.code = 'CCEA' AND qt.code = 'GCSE';

-- IMPORTANT: The total should be much less than 112,761!
-- Expected: around 3,239 total rows for CCEA GCSE 