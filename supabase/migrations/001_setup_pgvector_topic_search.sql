-- MIGRATION 001: Set Up pgvector + AI Topic Search Foundation
-- Run this in Supabase SQL Editor
-- Purpose: Enable semantic topic search with AI-generated metadata

-- ========================================
-- STEP 1: Enable pgvector Extension
-- ========================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension failed to install';
  END IF;
  RAISE NOTICE 'pgvector extension is enabled ✓';
END $$;

-- ========================================
-- STEP 2: Create topic_ai_metadata Table
-- ========================================

CREATE TABLE IF NOT EXISTS topic_ai_metadata (
  -- Primary key references existing curriculum_topics
  topic_id UUID PRIMARY KEY REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  
  -- Vector embedding for semantic search (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,
  
  -- Pre-generated AI content
  plain_english_summary TEXT NOT NULL,
  difficulty_band TEXT CHECK (difficulty_band IN ('core', 'standard', 'challenge')),
  exam_importance FLOAT CHECK (exam_importance BETWEEN 0 AND 1),
  
  -- Topic context for better search (denormalized for speed)
  subject_name TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  qualification_level TEXT NOT NULL,
  topic_level INTEGER,
  full_path TEXT[], -- Breadcrumb array: ['Cells', 'Membranes', 'Osmosis']
  
  -- Lifecycle tracking (for incremental updates)
  is_active BOOLEAN DEFAULT true,
  spec_version TEXT DEFAULT 'v1',
  
  -- Metadata
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: Create Vector Index
-- ========================================

-- Try HNSW (faster, but needs pgvector 0.5.0+)
DO $$
BEGIN
  CREATE INDEX topic_embedding_hnsw_idx ON topic_ai_metadata 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
  
  RAISE NOTICE 'HNSW index created successfully ✓';
  
EXCEPTION WHEN OTHERS THEN
  -- Fallback to IVFFlat if HNSW not available
  RAISE NOTICE 'HNSW not available, falling back to IVFFlat...';
  
  CREATE INDEX topic_embedding_ivf_idx ON topic_ai_metadata 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
  
  RAISE NOTICE 'IVFFlat index created successfully ✓';
END $$;

-- ========================================
-- STEP 4: Create Supporting Indexes
-- ========================================

-- Indexes for filtering before vector search
CREATE INDEX IF NOT EXISTS topic_metadata_subject_idx 
  ON topic_ai_metadata(subject_name);

CREATE INDEX IF NOT EXISTS topic_metadata_board_idx 
  ON topic_ai_metadata(exam_board);

CREATE INDEX IF NOT EXISTS topic_metadata_level_idx 
  ON topic_ai_metadata(qualification_level);

CREATE INDEX IF NOT EXISTS topic_metadata_importance_idx 
  ON topic_ai_metadata(exam_importance DESC);

CREATE INDEX IF NOT EXISTS topic_metadata_active_idx 
  ON topic_ai_metadata(is_active) WHERE is_active = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS topic_metadata_course_idx 
  ON topic_ai_metadata(exam_board, qualification_level, subject_name) 
  WHERE is_active = true;

-- ========================================
-- STEP 5: Create Helper View for Batch Processing
-- ========================================

CREATE OR REPLACE VIEW topics_with_context AS
SELECT 
  ct.id as topic_id,
  ct.topic_name,
  ct.topic_code,
  ct.topic_level,
  ct.sort_order,
  
  ebs.subject_name,
  ebs.subject_code,
  eb.code as exam_board,
  qt.code as qualification_level,
  
  -- Build hierarchical path (up to 4 levels deep)
  ARRAY_REMOVE(ARRAY[
    parent3.topic_name,
    parent2.topic_name,
    parent1.topic_name,
    ct.topic_name
  ], NULL) as full_path,
  
  -- Get all parent context for better embeddings
  COALESCE(parent1.topic_name, '') as parent_1_name,
  COALESCE(parent2.topic_name, '') as parent_2_name,
  COALESCE(parent3.topic_name, '') as parent_3_name,
  
  -- Metadata for lifecycle tracking
  ct.created_at
  
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id

-- Join parents for hierarchical context
LEFT JOIN curriculum_topics parent1 ON ct.parent_topic_id = parent1.id
LEFT JOIN curriculum_topics parent2 ON parent1.parent_topic_id = parent2.id
LEFT JOIN curriculum_topics parent3 ON parent2.parent_topic_id = parent3.id

WHERE ebs.is_current = true;

-- ========================================
-- STEP 6: Create Vector Search RPC Function
-- ========================================

CREATE OR REPLACE FUNCTION match_topics(
  query_embedding vector(1536),
  p_exam_board text DEFAULT NULL,
  p_qualification_level text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_match_threshold float DEFAULT 0.0,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  topic_id uuid,
  plain_english_summary text,
  difficulty_band text,
  exam_importance float,
  subject_name text,
  exam_board text,
  qualification_level text,
  topic_level int,
  full_path text[],
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    tam.topic_id,
    tam.plain_english_summary,
    tam.difficulty_band,
    tam.exam_importance,
    tam.subject_name,
    tam.exam_board,
    tam.qualification_level,
    tam.topic_level,
    tam.full_path,
    1 - (tam.embedding <=> query_embedding) as similarity
  FROM topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
    AND (1 - (tam.embedding <=> query_embedding)) >= p_match_threshold
  ORDER BY tam.embedding <=> query_embedding
  LIMIT p_limit;
$$;

-- ========================================
-- STEP 7: Create Helper Functions
-- ========================================

-- Function to get topics that need metadata generation
CREATE OR REPLACE FUNCTION get_topics_needing_metadata()
RETURNS TABLE (
  topic_id uuid,
  topic_name text,
  subject_name text,
  exam_board text,
  qualification_level text
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ct.id as topic_id,
    ct.topic_name,
    ebs.subject_name,
    eb.code as exam_board,
    qt.code as qualification_level
  FROM curriculum_topics ct
  JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
  LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
  WHERE ebs.is_current = true
    AND tam.topic_id IS NULL
  ORDER BY eb.code, qt.code, ebs.subject_name, ct.topic_level, ct.sort_order;
$$;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check extension is enabled
SELECT 
  'pgvector Extension' as check_name,
  extname,
  extversion
FROM pg_extension 
WHERE extname = 'vector';

-- Check table was created
SELECT 
  'topic_ai_metadata Table' as check_name,
  COUNT(*) as row_count
FROM topic_ai_metadata;

-- Check indexes exist
SELECT 
  'Indexes' as check_name,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata'
ORDER BY indexname;

-- Check how many topics need metadata
SELECT 
  'Topics Needing Metadata' as check_name,
  COUNT(*) as count
FROM get_topics_needing_metadata();

-- Check the view works
SELECT 
  'topics_with_context View' as check_name,
  COUNT(*) as total_topics,
  COUNT(DISTINCT exam_board) as exam_boards,
  COUNT(DISTINCT subject_name) as subjects
FROM topics_with_context;

-- Sample view data
SELECT 
  'Sample Topic Context' as check_name,
  topic_id,
  topic_name,
  exam_board,
  qualification_level,
  subject_name,
  full_path
FROM topics_with_context
LIMIT 5;

RAISE NOTICE '✅ All setup complete! Ready for batch metadata generation.';

