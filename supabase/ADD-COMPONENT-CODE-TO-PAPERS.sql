-- Add component_code column to staging_aqa_exam_papers
-- Needed for History (Component 1H, 2S, etc.)

ALTER TABLE staging_aqa_exam_papers 
ADD COLUMN IF NOT EXISTS component_code TEXT;

-- Update the unique constraint to include component_code
ALTER TABLE staging_aqa_exam_papers 
DROP CONSTRAINT IF EXISTS staging_aqa_exam_papers_subject_id_year_exam_series_paper_number_key;

-- New unique constraint: year + series + component (not paper number)
ALTER TABLE staging_aqa_exam_papers
ADD CONSTRAINT staging_aqa_exam_papers_unique_key
UNIQUE (subject_id, year, exam_series, component_code, tier);

SELECT '✅ component_code column added' as status;

