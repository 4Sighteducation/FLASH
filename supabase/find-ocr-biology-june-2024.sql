-- Find the OCR Biology A-Level June 2024 Paper 03 for testing

SELECT 
    p.id,
    s.subject_name,
    s.exam_board,
    s.qualification_type,
    p.year,
    p.exam_series,
    p.paper_number,
    p.component_code,
    p.question_paper_url,
    p.mark_scheme_url,
    p.examiner_report_url
FROM staging_aqa_exam_papers p
JOIN staging_aqa_subjects s ON p.subject_id = s.id
WHERE s.exam_board = 'OCR'
  AND s.subject_name LIKE '%Biology%'
  AND s.qualification_type = 'A-Level'
  AND p.year = 2024
  AND p.exam_series = 'June'
  AND (p.paper_number = 3 OR p.component_code = '03')
ORDER BY p.created_at DESC;

-- If that doesn't work, try broader search:
-- SELECT * FROM staging_aqa_exam_papers p
-- JOIN staging_aqa_subjects s ON p.subject_id = s.id  
-- WHERE s.exam_board = 'OCR'
--   AND s.subject_name LIKE '%Biology%'
--   AND p.year = 2024
-- ORDER BY p.exam_series, p.paper_number;

