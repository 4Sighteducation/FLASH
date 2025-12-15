-- ================================================================
-- CONFIRMED: Past papers are in staging_aqa_exam_papers
-- This query will show you exactly what's there
-- ================================================================

-- 1. Quick Summary
SELECT 
    'staging_aqa_exam_papers' as table_name,
    COUNT(*) as total_papers,
    COUNT(DISTINCT subject_id) as unique_subjects,
    MIN(year) as earliest_year,
    MAX(year) as latest_year,
    COUNT(question_paper_url) FILTER (WHERE question_paper_url IS NOT NULL) as has_question_paper,
    COUNT(mark_scheme_url) FILTER (WHERE mark_scheme_url IS NOT NULL) as has_mark_scheme,
    COUNT(examiner_report_url) FILTER (WHERE examiner_report_url IS NOT NULL) as has_examiner_report
FROM staging_aqa_exam_papers;

-- 2. Papers by Subject (Top 20)
SELECT 
    s.subject_name,
    s.subject_code,
    s.qualification_type,
    COUNT(*) as paper_count,
    MIN(p.year) as earliest,
    MAX(p.year) as latest,
    STRING_AGG(DISTINCT p.exam_series, ', ' ORDER BY p.exam_series) as series_available,
    COUNT(DISTINCT p.component_code) as components
FROM staging_aqa_exam_papers p
JOIN staging_aqa_subjects s ON p.subject_id = s.id
GROUP BY s.subject_name, s.subject_code, s.qualification_type
ORDER BY paper_count DESC
LIMIT 20;

-- 3. Sample Papers with Full Details
SELECT 
    s.subject_name,
    s.subject_code,
    p.year,
    p.exam_series,
    p.paper_number,
    p.component_code,
    p.tier,
    CASE WHEN p.question_paper_url IS NOT NULL THEN '✓' ELSE '✗' END as has_qp,
    CASE WHEN p.mark_scheme_url IS NOT NULL THEN '✓' ELSE '✗' END as has_ms,
    CASE WHEN p.examiner_report_url IS NOT NULL THEN '✓' ELSE '✗' END as has_er,
    SUBSTRING(p.question_paper_url, 1, 60) || '...' as qp_url_sample
FROM staging_aqa_exam_papers p
JOIN staging_aqa_subjects s ON p.subject_id = s.id
ORDER BY s.subject_name, p.year DESC, p.paper_number
LIMIT 30;

-- 4. Papers by Year Distribution
SELECT 
    year,
    COUNT(*) as paper_count,
    COUNT(DISTINCT subject_id) as subjects_covered,
    COUNT(DISTINCT exam_series) as series,
    STRING_AGG(DISTINCT exam_series, ', ' ORDER BY exam_series) as series_list
FROM staging_aqa_exam_papers
GROUP BY year
ORDER BY year DESC;

-- 5. Check for Component Codes (if column exists)
SELECT 
    component_code,
    COUNT(*) as paper_count,
    COUNT(DISTINCT subject_id) as subjects,
    STRING_AGG(DISTINCT s.subject_name, ', ' ORDER BY s.subject_name) as subject_names
FROM staging_aqa_exam_papers p
LEFT JOIN staging_aqa_subjects s ON p.subject_id = s.id
WHERE component_code IS NOT NULL
GROUP BY component_code
ORDER BY paper_count DESC
LIMIT 20;

-- 6. URL Patterns (to understand storage)
SELECT 
    CASE 
        WHEN question_paper_url LIKE '%cdn.sanity%' THEN 'Sanity CDN'
        WHEN question_paper_url LIKE '%https://%' THEN 'External HTTPS'
        WHEN question_paper_url LIKE '%http://%' THEN 'External HTTP'
        WHEN question_paper_url IS NULL THEN 'No URL'
        ELSE 'Other'
    END as url_type,
    COUNT(*) as count
FROM staging_aqa_exam_papers
GROUP BY url_type
ORDER BY count DESC;

-- 7. Data Quality Check
SELECT 
    'Data Quality' as check_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE question_paper_url IS NOT NULL OR mark_scheme_url IS NOT NULL OR examiner_report_url IS NOT NULL) as has_at_least_one_url,
    COUNT(*) FILTER (WHERE question_paper_url IS NOT NULL AND mark_scheme_url IS NOT NULL) as complete_sets,
    COUNT(*) FILTER (WHERE question_paper_url IS NULL AND mark_scheme_url IS NULL AND examiner_report_url IS NULL) as no_urls
FROM staging_aqa_exam_papers;

-- 8. Example Full Record (to see all columns)
SELECT *
FROM staging_aqa_exam_papers
LIMIT 1;

