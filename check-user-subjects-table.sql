-- Check user_subjects table structure and constraints

-- 1. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_subjects'
ORDER BY ordinal_position;

-- 2. Check constraints (including unique constraints)
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'user_subjects'::regclass;

-- 3. Test if table exists and is accessible
SELECT COUNT(*) as total_user_subjects FROM user_subjects;
