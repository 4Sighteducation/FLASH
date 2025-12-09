-- Check past papers structure in staging database
-- Run this to understand the data structure for implementation planning

-- 1. Check if past papers table exists and its structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name LIKE '%paper%'
ORDER BY table_name, ordinal_position;

-- 2. Sample past papers data
SELECT *
FROM exam_papers
LIMIT 5;

-- 3. Count past papers by subject and year
SELECT 
    ebs.subject_name,
    ebs.exam_board_id,
    COUNT(*) as paper_count,
    MIN(ep.exam_date) as earliest_paper,
    MAX(ep.exam_date) as latest_paper
FROM exam_papers ep
JOIN exam_board_subjects ebs ON ep.exam_board_subject_id = ebs.id
GROUP BY ebs.subject_name, ebs.exam_board_id
ORDER BY paper_count DESC
LIMIT 20;

-- 4. Check what document types are available
SELECT 
    paper_type,
    COUNT(*) as count,
    COUNT(DISTINCT exam_board_subject_id) as subjects_covered
FROM exam_papers
GROUP BY paper_type
ORDER BY count DESC;

-- 5. Sample URLs/paths to understand storage format
SELECT 
    id,
    exam_board_subject_id,
    paper_code,
    exam_date,
    paper_type,
    SUBSTRING(file_url, 1, 100) as file_url_sample,
    file_size_kb
FROM exam_papers
LIMIT 10;

-- 6. Check for mark schemes and examiner reports
SELECT 
    paper_code,
    COUNT(CASE WHEN paper_type = 'question_paper' THEN 1 END) as has_questions,
    COUNT(CASE WHEN paper_type = 'mark_scheme' THEN 1 END) as has_marks,
    COUNT(CASE WHEN paper_type = 'examiner_report' THEN 1 END) as has_report
FROM exam_papers
GROUP BY paper_code
HAVING COUNT(*) > 1
LIMIT 10;

