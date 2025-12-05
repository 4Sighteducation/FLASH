-- Add exam papers table to staging_aqa
CREATE TABLE IF NOT EXISTS staging_aqa_exam_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_aqa_subjects(id) ON DELETE CASCADE,
  
  year INTEGER NOT NULL,
  exam_series TEXT NOT NULL,
  paper_number INTEGER NOT NULL,
  tier TEXT,  -- 'Foundation', 'Higher', or NULL for A-Level
  
  -- PDF URLs on Sanity CDN
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(subject_id, year, exam_series, paper_number, tier)
);

CREATE INDEX idx_staging_aqa_papers_subject ON staging_aqa_exam_papers(subject_id);
CREATE INDEX idx_staging_aqa_papers_year ON staging_aqa_exam_papers(year DESC);

SELECT '✅ staging_aqa_exam_papers table created' as status;

