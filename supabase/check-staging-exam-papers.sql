-- Check staging_aqa_exam_papers table to see what past papers data we have
-- This is where the actual past papers are stored!

-- 1. Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'staging_aqa_exam_papers'
ORDER BY ordinal_position;

-- 2. Count total papers
SELECT 
    COUNT(*) as total_papers,
    COUNT(DISTINCT subject_id) as subjects_covered,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    COUNT(CASE WHEN question_paper_url IS NOT NULL THEN 1 END) as has_question_paper,
    COUNT(CASE WHEN mark_scheme_url IS NOT NULL THEN 1 END) as has_mark_scheme,
    COUNT(CASE WHEN examiner_report_url IS NOT NULL THEN 1 END) as has_examiner_report
FROM staging_aqa_exam_papers;

-- 3. Papers by subject (top 20)
SELECT 
    ebs.subject_name,
    ebs.qualification_type,
    COUNT(*) as paper_count,
    MIN(sap.year) as earliest_year,
    MAX(sap.year) as latest_year,
    STRING_AGG(DISTINCT sap.exam_series, ', ') as series_available
FROM staging_aqa_exam_papers sap
JOIN exam_board_subjects ebs ON sap.subject_id = ebs.id
GROUP BY ebs.subject_name, ebs.qualification_type
ORDER BY paper_count DESC
LIMIT 20;

-- 4. Sample paper data
SELECT 
    sap.id,
    ebs.subject_name,
    sap.year,
    sap.exam_series,
    sap.paper_number,
    CASE WHEN sap.question_paper_url IS NOT NULL THEN '✓' ELSE '✗' END as has_qp,
    CASE WHEN sap.mark_scheme_url IS NOT NULL THEN '✓' ELSE '✗' END as has_ms,
    CASE WHEN sap.examiner_report_url IS NOT NULL THEN '✓' ELSE '✗' END as has_er,
    LEFT(sap.question_paper_url, 60) as qp_url_preview
FROM staging_aqa_exam_papers sap
LEFT JOIN exam_board_subjects ebs ON sap.subject_id = ebs.id
ORDER BY sap.year DESC
LIMIT 20;

-- 5. Papers by year
SELECT 
    year,
    COUNT(*) as paper_count,
    COUNT(DISTINCT subject_id) as subjects
FROM staging_aqa_exam_papers
GROUP BY year
ORDER BY year DESC;

-- 6. Check for component_code column (if exists)
SELECT 
    COUNT(*) as total,
    COUNT(component_code) as has_component_code,
    STRING_AGG(DISTINCT component_code, ', ') as component_codes_used
FROM staging_aqa_exam_papers;

