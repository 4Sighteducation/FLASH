-- Verify Schema Status
-- This script checks what improvements have been successfully applied

-- 1. Check CASCADE deletes on foreign keys
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('users', 'user_topics', 'user_subjects', 'flashcards', 'card_reviews')
ORDER BY tc.table_name, tc.constraint_name;

-- 2. Check unique constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('user_topics', 'user_subjects', 'user_achievements')
ORDER BY tc.table_name;

-- 3. Check indexes
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 4. Check triggers
SELECT 
    event_object_table as table_name,
    trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND trigger_name LIKE 'update_%_updated_at'
ORDER BY table_name;

-- 5. Check Row Level Security status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename; 