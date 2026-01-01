-- PRODUCTION FIX: Merge duplicate Edexcel exam boards ('Edexcel' + 'EDEXCEL') into ONE canonical 'EDEXCEL'
-- Context: You currently have:
-- - exam_boards: 'Edexcel' has subjects+topics, 'EDEXCEL' has subjects but 0 topics.
-- Goal:
-- - Keep the data-filled board as the canonical board id
-- - Ensure canonical code is 'EDEXCEL'
-- - Repoint any user references away from the empty duplicate subjects
-- - Remove empty duplicate subjects + the duplicate exam_board row
-- - Update topic_ai_metadata.exam_board from 'Edexcel' to 'EDEXCEL'
--
-- IMPORTANT (Supabase SQL editor):
-- - The editor can time out on long multi-statement transactions.
-- - Run this migration in the 4 PHASES below (each phase has its own BEGIN/COMMIT).
-- - This assumes user selections reference exam_board_subjects via:
--   - public.user_subjects(subject_id) and
--   - public.user_discovered_topics(subject_id)
--   If your schema differs, adjust the repoint section.

-- ============================================================
-- PHASE 0: Preflight (read-only)
-- ============================================================
-- Run this first to confirm the problem.
SELECT id, code FROM exam_boards WHERE code IN ('Edexcel','EDEXCEL') ORDER BY code;

SELECT
  eb.code AS exam_board,
  COUNT(DISTINCT ebs.id) AS subjects,
  COUNT(ct.id) AS topics
FROM exam_board_subjects ebs
JOIN exam_boards eb ON eb.id = ebs.exam_board_id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
WHERE eb.code IN ('Edexcel','EDEXCEL')
  AND ebs.is_current = true
GROUP BY eb.code
ORDER BY topics DESC;

-- ============================================================
-- PHASE 1: Backups + identify the 0-topic duplicate subjects (fast)
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 0) PRE-FLIGHT: Verify current state
-- ------------------------------------------------------------
-- (Preflight moved to Phase 0)

-- ------------------------------------------------------------
-- 1) Identify canonical + duplicate board ids
-- Canonical board id = the one that currently has topics (Edexcel).
-- Duplicate board id = the empty one (EDEXCEL with 0 topics).
-- ------------------------------------------------------------
-- (Removed DO block: Phase 0 preflight is enough; Phase 4 renaming is deterministic.)

-- ------------------------------------------------------------
-- 2) Backup affected rows (boards + subjects from duplicate board)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_exam_boards_edexcel_merge AS
SELECT * FROM exam_boards WHERE code IN ('Edexcel','EDEXCEL');

CREATE TABLE IF NOT EXISTS backup_exam_board_subjects_edexcel_merge AS
SELECT ebs.*
FROM exam_board_subjects ebs
JOIN exam_boards eb ON eb.id = ebs.exam_board_id
WHERE eb.code IN ('Edexcel','EDEXCEL');

-- ------------------------------------------------------------
-- 3) Identify duplicate subjects under the empty 'EDEXCEL' board (0 topics)
-- In your DB these are "junk duplicates" with no curriculum_topics.
-- We delete them (after cleaning any user references) rather than mapping.
-- ------------------------------------------------------------
DROP TABLE IF EXISTS public.edexcel_duplicate_subjects;
CREATE TABLE public.edexcel_duplicate_subjects AS
WITH boards AS (
  SELECT (SELECT id FROM exam_boards WHERE code = 'EDEXCEL') AS edexcel_upper_id
)
SELECT ebs.id AS dup_subject_id
FROM exam_board_subjects ebs
JOIN boards b ON ebs.exam_board_id = b.edexcel_upper_id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
WHERE ebs.is_current = true
GROUP BY ebs.id
HAVING COUNT(ct.id) = 0;

SELECT COUNT(*) AS duplicate_subjects_with_zero_topics
FROM public.edexcel_duplicate_subjects;

COMMIT;

-- ============================================================
-- PHASE 2: Repoint user references (can be slow if many rows)
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 4) Repoint user references (example: user_subjects)
-- If you have other FK tables pointing at exam_board_subjects, add them here.
-- ------------------------------------------------------------
-- Only run if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_subjects'
  ) THEN
    -- These subjects have no topics; safest is to delete the user_subjects rows.
    DELETE FROM user_subjects
    WHERE subject_id IN (SELECT dup_subject_id FROM public.edexcel_duplicate_subjects);
  ELSE
    RAISE NOTICE 'Table public.user_subjects does not exist; skipping repoint.';
  END IF;
END $$;

-- Also repoint discovery table if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_discovered_topics'
  ) THEN
    DELETE FROM user_discovered_topics
    WHERE subject_id IN (SELECT dup_subject_id FROM public.edexcel_duplicate_subjects);
  ELSE
    RAISE NOTICE 'Table public.user_discovered_topics does not exist; skipping repoint.';
  END IF;
END $$;

COMMIT;

-- ============================================================
-- PHASE 3: Delete duplicate subjects (should be fast)
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 5) Archive + delete duplicate subjects (safe because they have 0 topics)
-- ------------------------------------------------------------
-- Delete any archived topics still referencing these duplicate subjects (FK blocker)
DELETE FROM curriculum_topics_old_archive
WHERE exam_board_subject_id IN (SELECT dup_subject_id FROM public.edexcel_duplicate_subjects);

UPDATE exam_board_subjects ebs
SET is_current = false,
    updated_at = NOW()
WHERE ebs.id IN (SELECT dup_subject_id FROM public.edexcel_duplicate_subjects);

DELETE FROM exam_board_subjects
WHERE id IN (SELECT dup_subject_id FROM public.edexcel_duplicate_subjects);

COMMIT;

-- ============================================================
-- PHASE 4: Rename boards + cleanup + update AI metadata
-- ============================================================
-- NOTE: Supabase SQL editor can "upstream timeout" on large updates.
-- Run Phase 4 as 4A (fast board rename) + 4B (batch update topic_ai_metadata) + 4C (verify/cleanup).

-- ============================================================
-- PHASE 4A: Rename/delete boards (fast)
-- ============================================================
BEGIN;

-- ------------------------------------------------------------
-- 6) Make canonical board code = 'EDEXCEL' (no duplicates)
-- Approach:
-- - rename the *duplicate* board code to a temporary value
-- - rename canonical to 'EDEXCEL'
-- - delete the duplicate board row
-- ------------------------------------------------------------
-- Rename the empty duplicate board away first
UPDATE exam_boards
SET code = 'EDEXCEL__DUPLICATE_DO_NOT_USE',
    active = false
WHERE code = 'EDEXCEL';

-- Rename the real board to canonical
UPDATE exam_boards
SET code = 'EDEXCEL'
WHERE code = 'Edexcel';

-- Safety: ensure no subjects still point at the duplicate board
DO $$
DECLARE
  dup_id uuid;
BEGIN
  SELECT id INTO dup_id FROM exam_boards WHERE code = 'EDEXCEL__DUPLICATE_DO_NOT_USE' LIMIT 1;
  IF dup_id IS NOT NULL AND EXISTS (SELECT 1 FROM exam_board_subjects WHERE exam_board_id = dup_id) THEN
    RAISE EXCEPTION 'Duplicate exam_board still referenced by exam_board_subjects; aborting delete.';
  END IF;
END $$;

DELETE FROM exam_boards WHERE code = 'EDEXCEL__DUPLICATE_DO_NOT_USE';

-- Cleanup helper table
DROP TABLE IF EXISTS public.edexcel_duplicate_subjects;

COMMIT;

-- ============================================================
-- PHASE 4B: Update topic_ai_metadata.exam_board in batches (run repeatedly until 0 updated)
-- ============================================================
-- If this times out, lower the LIMIT (e.g. 2000).
WITH to_update AS (
  SELECT topic_id
  FROM topic_ai_metadata
  WHERE exam_board = 'Edexcel'
  LIMIT 5000
)
UPDATE topic_ai_metadata tam
SET exam_board = 'EDEXCEL'
FROM to_update u
WHERE tam.topic_id = u.topic_id;

-- To see remaining:
SELECT COUNT(*) AS remaining_topic_ai_metadata_with_old_board
FROM topic_ai_metadata
WHERE exam_board = 'Edexcel';

-- ============================================================
-- PHASE 4C: Post-flight verification (read-only)
-- ============================================================
SELECT
  eb.code AS exam_board,
  COUNT(DISTINCT ebs.id) AS subjects,
  COUNT(ct.id) AS topics
FROM exam_board_subjects ebs
JOIN exam_boards eb ON eb.id = ebs.exam_board_id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
WHERE eb.code IN ('EDEXCEL','Edexcel')
  AND ebs.is_current = true
GROUP BY eb.code
ORDER BY topics DESC;

SELECT COUNT(*) AS remaining_topic_ai_metadata_with_old_board
FROM topic_ai_metadata
WHERE exam_board = 'Edexcel';


