-- ================================================================
-- LINK STAGING PAPERS TO PRODUCTION SUBJECTS
-- Creates a view that makes staging papers accessible via production subject IDs
-- This allows users to see papers for their subjects without migration
-- ================================================================

-- First, let's understand the mapping between staging and production subjects
-- staging_aqa_subjects.subject_code + qualification_type → exam_board_subjects.subject_code + qualification_type

-- Create a view that exposes staging papers with production subject IDs
CREATE OR REPLACE VIEW v_exam_papers_staging AS
SELECT 
    p.id,
    ebs.id as exam_board_subject_id,  -- Production subject ID (what user_subjects uses)
    p.year,
    p.exam_series,
    p.paper_number,
    p.component_code,
    p.tier,
    p.question_paper_url,
    p.mark_scheme_url,
    p.examiner_report_url,
    p.created_at,
    -- Include subject info for convenience
    ebs.subject_name,
    ebs.subject_code,
    ebs.qualification_type
FROM staging_aqa_exam_papers p
JOIN staging_aqa_subjects ss ON p.subject_id = ss.id
JOIN exam_board_subjects ebs ON (
    -- Match by subject code and qualification type
    ss.subject_code = ebs.subject_code 
    AND ss.qualification_type = ebs.qualification_type
    -- Only AQA board papers (staging_aqa_* is all AQA)
    AND ebs.exam_board_id = (SELECT id FROM exam_boards WHERE exam_board_name = 'AQA')
);

-- Test the view
SELECT 
    'VIEW TEST' as test,
    COUNT(*) as total_papers_linked,
    COUNT(DISTINCT exam_board_subject_id) as subjects_linked,
    MIN(year) as earliest_year,
    MAX(year) as latest_year
FROM v_exam_papers_staging;

-- Show which subjects have papers available
SELECT 
    subject_name,
    qualification_type,
    COUNT(*) as paper_count,
    MIN(year) as earliest,
    MAX(year) as latest
FROM v_exam_papers_staging
GROUP BY subject_name, qualification_type, exam_board_subject_id
ORDER BY paper_count DESC
LIMIT 20;

-- ================================================================
-- USAGE IN APP:
-- ================================================================
-- Instead of querying exam_papers (empty), query v_exam_papers_staging
--
-- Example: Get papers for a user's subject
-- SELECT * FROM v_exam_papers_staging
-- WHERE exam_board_subject_id = 'user-subject-id'
-- ORDER BY year DESC, paper_number;
--
-- Example: Get papers for user's subject + specific year
-- SELECT * FROM v_exam_papers_staging
-- WHERE exam_board_subject_id = 'user-subject-id'
-- AND year = 2024
-- ORDER BY exam_series, paper_number;
-- ================================================================

