-- Drop the existing index if it exists
DROP INDEX IF EXISTS topic_embedding_idx;

-- Create a more optimized index for better performance
-- Using ivfflat instead of hnsw for better performance with large datasets
CREATE INDEX topic_embedding_idx ON public.topic_ai_metadata
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Analyze the table to update statistics
ANALYZE topic_ai_metadata;

-- Add additional indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_topic_metadata_exam_board 
ON topic_ai_metadata(exam_board);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_qualification 
ON topic_ai_metadata(qualification_level);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_subject 
ON topic_ai_metadata(subject_name);

CREATE INDEX IF NOT EXISTS idx_topic_metadata_active 
ON topic_ai_metadata(is_active);

-- Verify the indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'topic_ai_metadata';

DO $$
BEGIN
  RAISE NOTICE '✅ Vector index optimized for 50k+ topics!';
END $$;









