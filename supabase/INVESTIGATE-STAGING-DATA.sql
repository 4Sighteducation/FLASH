-- ================================================================
-- INVESTIGATE STAGING DATA
-- Review Biology & History before scaling to more subjects
-- ================================================================

-- ================================================================
-- 1. OVERALL SUMMARY
-- ================================================================
SELECT 
  s.subject_name,
  s.subject_code,
  s.qualification_type,
  COUNT(DISTINCT t.id) as total_topics,
  MAX(t.topic_level) as max_depth,
  COUNT(DISTINCT t.id) FILTER (WHERE t.topic_level = 0) as level_0,
  COUNT(DISTINCT t.id) FILTER (WHERE t.topic_level = 1) as level_1,
  COUNT(DISTINCT t.id) FILTER (WHERE t.topic_level = 2) as level_2,
  COUNT(DISTINCT t.id) FILTER (WHERE t.topic_level = 3) as level_3,
  COUNT(DISTINCT p.id) as paper_sets,
  COUNT(DISTINCT p.component_code) as unique_components
FROM staging_aqa_subjects s
LEFT JOIN staging_aqa_topics t ON t.subject_id = s.id
LEFT JOIN staging_aqa_exam_papers p ON p.subject_id = s.id
GROUP BY s.subject_name, s.subject_code, s.qualification_type
ORDER BY s.subject_name;

-- Expected:
-- Biology: 70 topics (levels 0-2), 17 papers, NULL components
-- History: 968 topics (levels 0-3), 53 papers, ~20-25 components

-- ================================================================
-- 2. BIOLOGY TOPIC HIERARCHY SAMPLE
-- ================================================================
SELECT 
  'BIOLOGY SAMPLE' as check_name,
  topic_code,
  topic_level,
  topic_name,
  is_a_level_only
FROM staging_aqa_topics
WHERE subject_id = (SELECT id FROM staging_aqa_subjects WHERE subject_code = '7402')
ORDER BY topic_code
LIMIT 30;

-- Should show:
-- 3.1, 3.1.1, 3.1.2, 3.1.4, 3.1.4.1, 3.1.4.2, etc.

-- ================================================================
-- 3. HISTORY TOPIC HIERARCHY SAMPLE
-- ================================================================
SELECT 
  'HISTORY SAMPLE' as check_name,
  topic_code,
  topic_level,
  topic_name
FROM staging_aqa_topics
WHERE subject_id = (SELECT id FROM staging_aqa_subjects WHERE subject_code = '7042')
ORDER BY topic_code
LIMIT 30;

-- Should show:
-- 1A, 1A.P1, 1A.P1.S1, 1A.P1.S1.1, 1A.P1.S1.2, etc.

-- ================================================================
-- 4. CHECK PARENT-CHILD RELATIONSHIPS
-- ================================================================
-- Verify hierarchy is properly linked

-- Biology hierarchy
WITH RECURSIVE bio_tree AS (
  SELECT 
    id,
    topic_code,
    topic_name,
    topic_level,
    parent_topic_id,
    topic_code as path
  FROM staging_aqa_topics
  WHERE subject_id = (SELECT id FROM staging_aqa_subjects WHERE subject_code = '7402')
    AND parent_topic_id IS NULL
  
  UNION ALL
  
  SELECT 
    t.id,
    t.topic_code,
    t.topic_name,
    t.topic_level,
    t.parent_topic_id,
    bt.path || ' > ' || t.topic_code
  FROM staging_aqa_topics t
  JOIN bio_tree bt ON t.parent_topic_id = bt.id
)
SELECT 
  'Biology Hierarchy Check' as test,
  topic_level,
  COUNT(*) as count,
  STRING_AGG(path, ' | ' ORDER BY path) FILTER (WHERE topic_level <= 1) as sample_paths
FROM bio_tree
GROUP BY topic_level
ORDER BY topic_level;

-- ================================================================
-- 5. HISTORY PAPERS BY COMPONENT
-- ================================================================
SELECT 
  component_code,
  COUNT(*) as paper_count,
  COUNT(question_paper_url) as has_question,
  COUNT(mark_scheme_url) as has_mark,
  COUNT(examiner_report_url) as has_report,
  STRING_AGG(DISTINCT year::text, ', ' ORDER BY year::text DESC) as years_available
FROM staging_aqa_exam_papers
WHERE subject_id = (SELECT id FROM staging_aqa_subjects WHERE subject_code = '7042')
GROUP BY component_code
ORDER BY component_code;

-- Shows which components have papers for which years

-- ================================================================
-- 6. CHECK FOR DUPLICATES (Should be 0!)
-- ================================================================
SELECT 
  'Duplicate Check' as test,
  subject_id,
  topic_code,
  topic_name,
  COUNT(*) as duplicate_count
FROM staging_aqa_topics
GROUP BY subject_id, topic_code, topic_name
HAVING COUNT(*) > 1;

-- Should return ZERO rows (no duplicates)

-- ================================================================
-- 7. BIOLOGY PAPERS DETAIL
-- ================================================================
SELECT 
  year,
  exam_series,
  paper_number,
  question_paper_url IS NOT NULL as has_question,
  mark_scheme_url IS NOT NULL as has_mark,
  examiner_report_url IS NOT NULL as has_report
FROM staging_aqa_exam_papers
WHERE subject_id = (SELECT id FROM staging_aqa_subjects WHERE subject_code = '7402')
ORDER BY year DESC, paper_number;

-- ================================================================
-- 8. DATA QUALITY METRICS
-- ================================================================
SELECT 
  'Data Quality Check' as metric,
  (SELECT COUNT(*) FROM staging_aqa_topics WHERE topic_name IS NULL OR topic_name = '') as topics_missing_name,
  (SELECT COUNT(*) FROM staging_aqa_topics WHERE topic_code IS NULL OR topic_code = '') as topics_missing_code,
  (SELECT COUNT(*) FROM staging_aqa_topics WHERE parent_topic_id IS NOT NULL AND topic_level = 0) as level_0_with_parent,
  (SELECT COUNT(*) FROM staging_aqa_exam_papers WHERE question_paper_url IS NULL AND mark_scheme_url IS NULL AND examiner_report_url IS NULL) as papers_with_no_urls;

-- All should be 0 (indicates good data quality)

-- ================================================================
-- 9. COMPARISON: SIMPLE VS COMPLEX SUBJECTS
-- ================================================================
SELECT 
  'Subject Comparison' as analysis,
  CASE 
    WHEN subject_code = '7402' THEN 'Biology (Simple)'
    WHEN subject_code = '7042' THEN 'History (Complex)'
  END as subject_type,
  COUNT(DISTINCT t.id) as total_topics,
  MAX(t.topic_level) as max_depth,
  ROUND(AVG(t.topic_level), 2) as avg_depth,
  COUNT(DISTINCT p.id) as paper_sets,
  COUNT(DISTINCT p.component_code) as unique_components
FROM staging_aqa_subjects s
LEFT JOIN staging_aqa_topics t ON t.subject_id = s.id
LEFT JOIN staging_aqa_exam_papers p ON p.subject_id = s.id
WHERE s.subject_code IN ('7402', '7042')
GROUP BY subject_code
ORDER BY subject_code;

-- Shows the structural differences between subject types

