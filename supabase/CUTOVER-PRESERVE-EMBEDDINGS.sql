-- ================================================================
-- CUTOVER: Preserve Existing Embeddings + AI Metadata
-- ================================================================
-- Use this when migrating curriculum topics to production (subjects/topics)
-- but you want to avoid re-generating AI metadata for unchanged topics.
--
-- Context:
-- - topic_ai_metadata.topic_id REFERENCES curriculum_topics(id) ON DELETE CASCADE
-- - If you delete curriculum_topics during migration, embeddings get deleted too.
-- - This script backs up topic_ai_metadata, then restores rows whose topic_id
--   exists again after migration, then you run the generator to fill gaps.
--
-- Safe for: "no live users" cutovers, and also safe later if you want to preserve
-- metadata across migrations.
--
-- ================================================================
-- PHASE 0: (OPTIONAL) Pre-flight checks
-- ================================================================
-- How many topics currently have metadata?
-- SELECT COUNT(*) AS metadata_rows FROM public.topic_ai_metadata;
-- SELECT COUNT(*) AS needing_metadata FROM public.get_topics_needing_metadata();
--
-- ================================================================
-- PHASE 1: BACKUP (run BEFORE migration)
-- ================================================================
BEGIN;

-- Drop previous backup (intentional: keeps this repeatable and simple)
--
-- IMPORTANT:
-- If a previous run failed mid-transaction, Postgres can sometimes leave behind the
-- composite TYPE with the same name (even if the table doesn't exist). That causes:
--   ERROR 23505 duplicate key value violates unique constraint pg_type_typname_nsp_index
-- So we drop BOTH the table and the type, in that order.
DROP TABLE IF EXISTS public.topic_ai_metadata_backup_pre_cutover CASCADE;
DROP TYPE IF EXISTS public.topic_ai_metadata_backup_pre_cutover CASCADE;

-- Create backup snapshot
CREATE TABLE public.topic_ai_metadata_backup_pre_cutover AS
SELECT * FROM public.topic_ai_metadata;

-- Record a quick checksum-like count for confidence
SELECT
  'BACKUP COMPLETE' AS status,
  (SELECT COUNT(*) FROM public.topic_ai_metadata) AS current_rows,
  (SELECT COUNT(*) FROM public.topic_ai_metadata_backup_pre_cutover) AS backup_rows;

COMMIT;

-- ================================================================
-- PHASE 2: RUN YOUR TOPIC MIGRATION NOW
-- ================================================================
-- Example (pipeline repo):
--   database/migrations/migrate-all-staging-to-production-FIXED.sql
--
-- NOTE: If your migration deletes curriculum_topics, embeddings will be deleted.
-- That is expected; we restore them in the next phase.
--
-- ================================================================
-- PHASE 3: RESTORE (run AFTER migration)
-- ================================================================
BEGIN;

-- Restore only rows whose topic_id exists in the newly-migrated curriculum_topics
INSERT INTO public.topic_ai_metadata (
  topic_id,
  embedding,
  plain_english_summary,
  difficulty_band,
  exam_importance,
  subject_name,
  exam_board,
  qualification_level,
  topic_level,
  full_path,
  is_active,
  spec_version,
  generated_at,
  last_updated
)
SELECT
  b.topic_id,
  b.embedding,
  b.plain_english_summary,
  b.difficulty_band,
  b.exam_importance,
  b.subject_name,
  b.exam_board,
  b.qualification_level,
  b.topic_level,
  b.full_path,
  b.is_active,
  b.spec_version,
  b.generated_at,
  b.last_updated
FROM public.topic_ai_metadata_backup_pre_cutover b
JOIN public.curriculum_topics ct ON ct.id = b.topic_id
ON CONFLICT (topic_id) DO UPDATE SET
  embedding = EXCLUDED.embedding,
  plain_english_summary = EXCLUDED.plain_english_summary,
  difficulty_band = EXCLUDED.difficulty_band,
  exam_importance = EXCLUDED.exam_importance,
  subject_name = EXCLUDED.subject_name,
  exam_board = EXCLUDED.exam_board,
  qualification_level = EXCLUDED.qualification_level,
  topic_level = EXCLUDED.topic_level,
  full_path = EXCLUDED.full_path,
  is_active = EXCLUDED.is_active,
  spec_version = EXCLUDED.spec_version,
  generated_at = EXCLUDED.generated_at,
  last_updated = EXCLUDED.last_updated;

COMMIT;

-- ================================================================
-- PHASE 4: VERIFY + FILL ONLY NEW TOPICS
-- ================================================================
-- 1) Verify restore coverage
SELECT
  'POST-RESTORE' AS stage,
  (SELECT COUNT(*) FROM public.curriculum_topics) AS curriculum_topics,
  (SELECT COUNT(*) FROM public.topic_ai_metadata) AS topic_ai_metadata_rows,
  (SELECT COUNT(*) FROM public.get_topics_needing_metadata()) AS needing_metadata;
--
-- 2) Run generator to fill gaps only (in FLASH repo):
--    cd scripts/topic-ai-generation
--    npm install
--    npm run generate
--
-- 3) Rebuild/optimize vector index if you restored/inserted a lot:
--    - Run FLASH/supabase/migrations/003_optimize_vector_index.sql
--    - Then: ANALYZE public.topic_ai_metadata;
--
-- ================================================================
-- PHASE 5: (OPTIONAL) Clean up backup after you’re confident
-- ================================================================
-- DROP TABLE public.topic_ai_metadata_backup_pre_cutover;


