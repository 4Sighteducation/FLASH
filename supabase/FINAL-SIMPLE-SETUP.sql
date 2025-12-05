-- ================================================================
-- FINAL SIMPLE SETUP - Fixed for Supabase API Access
-- ================================================================
-- Problem: Custom schemas can't be accessed via Supabase JS client
-- Solution: Use public schema with prefixed table names
-- ================================================================

-- Clean up everything
DROP TABLE IF EXISTS staging_aqa_exam_papers CASCADE;
DROP TABLE IF EXISTS staging_aqa_topics CASCADE;
DROP TABLE IF EXISTS staging_aqa_subjects CASCADE;
DROP TABLE IF EXISTS staging_ocr_topics CASCADE;
DROP TABLE IF EXISTS staging_ocr_subjects CASCADE;
DROP TABLE IF EXISTS staging_edexcel_topics CASCADE;
DROP TABLE IF EXISTS staging_edexcel_subjects CASCADE;
DROP TABLE IF EXISTS exam_papers CASCADE;
DROP TABLE IF EXISTS curriculum_topics CASCADE;
DROP SCHEMA IF EXISTS staging_aqa CASCADE;
DROP SCHEMA IF EXISTS staging_ocr CASCADE;
DROP SCHEMA IF EXISTS staging_edexcel CASCADE;

-- ================================================================
-- Production Tables (in public schema)
-- ================================================================

CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_board_subject_id UUID NOT NULL REFERENCES exam_board_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  topic_code TEXT,
  topic_level INTEGER NOT NULL,
  sort_order INTEGER,
  spec_version TEXT,
  source_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_board_subject_id, topic_name, topic_level)
);

CREATE INDEX idx_curriculum_topics_subject ON curriculum_topics(exam_board_subject_id);
CREATE INDEX idx_curriculum_topics_parent ON curriculum_topics(parent_topic_id);

CREATE TABLE exam_papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_board_subject_id UUID NOT NULL REFERENCES exam_board_subjects(id) ON DELETE CASCADE,
  year INTEGER,
  exam_series TEXT,
  paper_number INTEGER,
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================
-- Staging Tables (in public schema with prefix)
-- ================================================================

-- AQA Staging
CREATE TABLE staging_aqa_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT,
  specification_url TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_aqa_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_aqa_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_aqa_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER NOT NULL,
  is_a_level_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, topic_code)
);

CREATE INDEX idx_staging_aqa_topics_subject ON staging_aqa_topics(subject_id);

-- OCR Staging
CREATE TABLE staging_ocr_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT,
  specification_url TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_ocr_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_ocr_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_ocr_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, topic_code)
);

-- Edexcel Staging
CREATE TABLE staging_edexcel_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT,
  specification_url TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_edexcel_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_edexcel_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_edexcel_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, topic_code)
);

-- ================================================================
-- Verify
-- ================================================================
SELECT 
  '✅ SETUP COMPLETE' as status,
  tablename,
  CASE 
    WHEN tablename LIKE 'staging_%' THEN 'Staging table'
    ELSE 'Production table'
  END as type
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('curriculum_topics', 'exam_papers', 
                    'staging_aqa_subjects', 'staging_aqa_topics',
                    'staging_ocr_subjects', 'staging_ocr_topics',
                    'staging_edexcel_subjects', 'staging_edexcel_topics')
ORDER BY tablename;

