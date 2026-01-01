-- DIAGNOSTIC: Find where embeddings (pgvector) live in this Supabase project
-- Paste into Supabase SQL editor and run.

-- 1) Verify pgvector extension
SELECT
  'pgvector extension' AS check_name,
  extname,
  extversion
FROM pg_extension
WHERE extname = 'vector';

-- 2) List all vector-typed columns (this will show embedding tables)
SELECT
  'vector columns' AS check_name,
  n.nspname AS schema_name,
  c.relname AS table_name,
  a.attname AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE a.attnum > 0
  AND NOT a.attisdropped
  AND pg_catalog.format_type(a.atttypid, a.atttypmod) LIKE 'vector(%'
ORDER BY schema_name, table_name, column_name;

-- 3) Show indexes on the embeddings table (if you used the default name)
SELECT
  'topic_ai_metadata indexes' AS check_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'topic_ai_metadata'
ORDER BY indexname;

-- 4) Quick row counts + breakdown (helps estimate re-embedding workload)
SELECT
  'topic_ai_metadata rowcount' AS check_name,
  COUNT(*) AS rows
FROM public.topic_ai_metadata;

SELECT
  'topic_ai_metadata breakdown' AS check_name,
  exam_board,
  qualification_level,
  COUNT(*) AS rows
FROM public.topic_ai_metadata
GROUP BY exam_board, qualification_level
ORDER BY exam_board, qualification_level;

-- 5) Show the RPCs used by the app for vector search (match_topics + limited variant)
SELECT
  'search RPCs' AS check_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('match_topics', 'match_topics_limited', 'search_topics_by_text', 'get_topics_needing_metadata')
ORDER BY p.proname;


