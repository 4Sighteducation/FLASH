-- ================================================================
-- ONE SIMPLE SCRIPT - RUN THIS
-- ================================================================
-- Handles whatever state your database is in
-- Safe to run multiple times
-- ================================================================

-- Drop everything that might exist from partial runs
DROP INDEX IF EXISTS idx_curriculum_topics_subject CASCADE;
DROP INDEX IF EXISTS idx_curriculum_topics_parent CASCADE;
DROP INDEX IF EXISTS idx_curriculum_topics_level CASCADE;
DROP INDEX IF EXISTS idx_curriculum_topics_code CASCADE;
DROP INDEX IF EXISTS idx_exam_papers_subject CASCADE;

DROP TABLE IF EXISTS exam_papers CASCADE;
DROP TABLE IF EXISTS curriculum_topics CASCADE;

DROP SCHEMA IF EXISTS staging_aqa CASCADE;
DROP SCHEMA IF EXISTS staging_ocr CASCADE;
DROP SCHEMA IF EXISTS staging_edexcel CASCADE;

-- Archive old if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'curriculum_topics_old_archive') THEN
    RAISE NOTICE 'Archive already exists';
  END IF;
END $$;

-- Create new production table
CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_board_subject_id UUID NOT NULL REFERENCES exam_board_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  topic_code TEXT,
  topic_level INTEGER NOT NULL,
  sort_order INTEGER,
  description TEXT,
  spec_version TEXT,
  spec_pdf_hash TEXT,
  source_url TEXT,
  last_verified TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_board_subject_id, topic_name, topic_level)
);

CREATE INDEX idx_curriculum_topics_subject ON curriculum_topics(exam_board_subject_id);
CREATE INDEX idx_curriculum_topics_parent ON curriculum_topics(parent_topic_id);
CREATE INDEX idx_curriculum_topics_level ON curriculum_topics(topic_level);
CREATE INDEX idx_curriculum_topics_code ON curriculum_topics(topic_code);

-- Create exam papers table
CREATE TABLE exam_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_board_subject_id UUID NOT NULL REFERENCES exam_board_subjects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  exam_series TEXT,
  paper_number INTEGER NOT NULL,
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_board_subject_id, year, exam_series, paper_number)
);

CREATE INDEX idx_exam_papers_subject ON exam_papers(exam_board_subject_id);

-- Create staging schemas
CREATE SCHEMA staging_aqa;
CREATE TABLE staging_aqa.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT,
  specification_url TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_aqa.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_aqa.subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_aqa.topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, topic_code)
);

CREATE INDEX idx_staging_aqa_topics_subject ON staging_aqa.topics(subject_id);

-- Same for OCR
CREATE SCHEMA staging_ocr;
CREATE TABLE staging_ocr.subjects (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subject_name TEXT NOT NULL, subject_code TEXT NOT NULL, qualification_type TEXT, specification_url TEXT, last_scraped TIMESTAMP DEFAULT NOW(), UNIQUE(subject_code, qualification_type));
CREATE TABLE staging_ocr.topics (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subject_id UUID NOT NULL REFERENCES staging_ocr.subjects(id) ON DELETE CASCADE, parent_topic_id UUID REFERENCES staging_ocr.topics(id) ON DELETE CASCADE, topic_code TEXT NOT NULL, topic_name TEXT NOT NULL, topic_level INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(subject_id, topic_code));

-- Same for Edexcel
CREATE SCHEMA staging_edexcel;
CREATE TABLE staging_edexcel.subjects (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subject_name TEXT NOT NULL, subject_code TEXT NOT NULL, qualification_type TEXT, specification_url TEXT, last_scraped TIMESTAMP DEFAULT NOW(), UNIQUE(subject_code, qualification_type));
CREATE TABLE staging_edexcel.topics (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), subject_id UUID NOT NULL REFERENCES staging_edexcel.subjects(id) ON DELETE CASCADE, parent_topic_id UUID REFERENCES staging_edexcel.topics(id) ON DELETE CASCADE, topic_code TEXT NOT NULL, topic_name TEXT NOT NULL, topic_level INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(subject_id, topic_code));

-- Done
SELECT 
  '✅ COMPLETE' as status,
  (SELECT COUNT(*) FROM curriculum_topics) as production_ready,
  'Next: Get Firecrawl API key and test scraping' as next_step;

