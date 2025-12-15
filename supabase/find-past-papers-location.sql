-- COMPREHENSIVE SEARCH: Where are the past papers actually stored?
-- Check all possible locations

-- ================================================================
-- 1. CHECK ALL TABLES THAT MIGHT CONTAIN PAPERS
-- ================================================================

-- Check if exam_papers exists and has data (production)
SELECT 
    'exam_papers (production)' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT exam_board_subject_id) as subjects,
    MIN(year) as min_year,
    MAX(year) as max_year,
    COUNT(question_paper_url) as has_question_url,
    COUNT(mark_scheme_url) as has_mark_url
FROM exam_papers;

-- Check if staging_aqa_exam_papers exists and has data (staging)
SELECT 
    'staging_aqa_exam_papers (staging)' as table_name,
    COUNT(*) as total_rows,
    COUNT(DISTINCT subject_id) as subjects,
    MIN(year) as min_year,
    MAX(year) as max_year,
    COUNT(question_paper_url) as has_question_url,
    COUNT(mark_scheme_url) as has_mark_url
FROM staging_aqa_exam_papers;

-- ================================================================
-- 2. LIST ALL TABLES WITH 'PAPER' IN THE NAME
-- ================================================================
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE '%paper%'
ORDER BY schemaname, tablename;

-- ================================================================
-- 3. IF STAGING HAS DATA, SHOW SAMPLE RECORDS
-- ================================================================
SELECT 
    'STAGING SAMPLE' as source,
    sap.id,
    s.subject_name,
    s.subject_code,
    sap.year,
    sap.exam_series,
    sap.paper_number,
    sap.component_code,
    LEFT(sap.question_paper_url, 50) as qp_url_preview,
    LEFT(sap.mark_scheme_url, 50) as ms_url_preview,
    LEFT(sap.examiner_report_url, 50) as er_url_preview
FROM staging_aqa_exam_papers sap
LEFT JOIN staging_aqa_subjects s ON sap.subject_id = s.id
ORDER BY sap.year DESC, s.subject_name
LIMIT 10;

-- ================================================================
-- 4. COUNT BY SUBJECT IN STAGING
-- ================================================================
SELECT 
    s.subject_name,
    s.qualification_type,
    COUNT(*) as paper_count,
    MIN(sap.year) as earliest,
    MAX(sap.year) as latest,
    STRING_AGG(DISTINCT sap.exam_series, ', ') as series,
    COUNT(DISTINCT sap.component_code) as components
FROM staging_aqa_exam_papers sap
JOIN staging_aqa_subjects s ON sap.subject_id = s.id
GROUP BY s.subject_name, s.qualification_type
ORDER BY paper_count DESC
LIMIT 20;

-- ================================================================
-- 5. CHECK FOR SCHEMA NAMESPACES
-- ================================================================
SELECT 
    nspname as schema_name,
    COUNT(*) as table_count
FROM pg_namespace n
JOIN pg_class c ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND nspname NOT IN ('pg_catalog', 'information_schema')
GROUP BY nspname
ORDER BY nspname;

-- ================================================================
-- 6. CHECK staging_aqa SCHEMA IF IT EXISTS
-- ================================================================
SELECT 
    table_schema,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = t.table_schema 
     AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'staging_aqa'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ================================================================
-- SUMMARY QUERY: WHERE ARE THE PAPERS?
-- ================================================================
SELECT 
    'SUMMARY' as info,
    CASE 
        WHEN (SELECT COUNT(*) FROM exam_papers) > 0 THEN 'exam_papers (production)'
        WHEN (SELECT COUNT(*) FROM staging_aqa_exam_papers) > 0 THEN 'staging_aqa_exam_papers'
        ELSE 'NO PAPERS FOUND'
    END as papers_location,
    COALESCE(
        (SELECT COUNT(*) FROM exam_papers),
        (SELECT COUNT(*) FROM staging_aqa_exam_papers),
        0
    ) as total_papers_found;

