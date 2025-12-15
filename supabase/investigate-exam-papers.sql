-- Investigate existing exam papers data
-- Run this to see what we have available for the Past Papers feature

-- 1. Check exam_papers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'exam_papers'
ORDER BY ordinal_position;

-- 2. Count total papers available
SELECT 
    COUNT(*) as total_papers,
    COUNT(DISTINCT exam_board_subject_id) as subjects_covered,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    COUNT(CASE WHEN question_paper_url IS NOT NULL THEN 1 END) as has_question_paper,
    COUNT(CASE WHEN mark_scheme_url IS NOT NULL THEN 1 END) as has_mark_scheme,
    COUNT(CASE WHEN examiner_report_url IS NOT NULL THEN 1 END) as has_examiner_report
FROM exam_papers;

-- 3. Papers by subject (top 20)
SELECT 
    ebs.subject_name,
    eb.exam_board_name,
    ebs.qualification_type,
    COUNT(*) as paper_count,
    MIN(ep.year) as earliest_year,
    MAX(ep.year) as latest_year,
    STRING_AGG(DISTINCT ep.exam_series, ', ') as series_available
FROM exam_papers ep
JOIN exam_board_subjects ebs ON ep.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
GROUP BY ebs.subject_name, eb.exam_board_name, ebs.qualification_type
ORDER BY paper_count DESC
LIMIT 20;

-- 4. Sample paper data
SELECT 
    ep.id,
    ebs.subject_name,
    eb.exam_board_name,
    ep.year,
    ep.exam_series,
    ep.paper_number,
    CASE 
        WHEN ep.question_paper_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_qp,
    CASE 
        WHEN ep.mark_scheme_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_ms,
    CASE 
        WHEN ep.examiner_report_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_er
FROM exam_papers ep
JOIN exam_board_subjects ebs ON ep.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
ORDER BY ep.year DESC, ebs.subject_name
LIMIT 20;

-- 5. Papers by year
SELECT 
    year,
    COUNT(*) as paper_count,
    COUNT(DISTINCT exam_board_subject_id) as subjects
FROM exam_papers
GROUP BY year
ORDER BY year DESC;

-- 6. Check for any additional columns we might have
SELECT *
FROM exam_papers
LIMIT 1;

