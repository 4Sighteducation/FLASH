-- Create RPC function for subject search with exam board grouping
-- Date: December 6, 2025
-- Purpose: Support new SubjectSearchScreen

CREATE OR REPLACE FUNCTION search_subjects_with_boards(
  p_search_term TEXT,
  p_qualification_code TEXT
)
RETURNS TABLE (
  subject_name TEXT,
  qualification_level TEXT,
  exam_board_options JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Normalize only trailing qualification tags so buckets merge:
    -- "Physics" + "Physics (GCSE)" → "Physics"
    -- Keeps legitimate variants like "Physics A (Gateway Science)" distinct.
    regexp_replace(
      ebs.subject_name,
      '\s*\((GCSE|A-?Level|AS-?Level|International GCSE|International A-?Level|National 5|Higher|Advanced Higher|Level 3 Extended Project)\)\s*$',
      '',
      'i'
    )::TEXT AS subject_name,
    qt.code::TEXT as qualification_level,
    jsonb_agg(
      jsonb_build_object(
        'subject_id', ebs.id,
        'subject_name', ebs.subject_name,
        'subject_code', ebs.subject_code,
        'exam_board_code', eb.code,
        'exam_board_name', eb.full_name,
        'topic_count', (
          SELECT COUNT(*) 
          FROM curriculum_topics ct 
          WHERE ct.exam_board_subject_id = ebs.id
        )
      ) ORDER BY eb.code
    ) as exam_board_options
  FROM exam_board_subjects ebs
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
  WHERE ebs.subject_name ILIKE '%' || p_search_term || '%'
    AND qt.code = p_qualification_code
    AND ebs.is_current = true
  GROUP BY
    regexp_replace(
      ebs.subject_name,
      '\s*\((GCSE|A-?Level|AS-?Level|International GCSE|International A-?Level|National 5|Higher|Advanced Higher|Level 3 Extended Project)\)\s*$',
      '',
      'i'
    ),
    qt.code
  ORDER BY subject_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_subjects_with_boards(TEXT, TEXT) TO authenticated;

-- Test the function
SELECT * FROM search_subjects_with_boards('Physics', 'A_LEVEL');
SELECT * FROM search_subjects_with_boards('Biology', 'GCSE');
