-- ============================================
-- DIAGNOSTIC: Reveal Context Feature Issues
-- Run this FIRST to understand what exists
-- ============================================

-- ========================================
-- 1. CHECK: Does is_overview column exist in flashcards?
-- ========================================
SELECT 
    'flashcards columns' as check_type,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'flashcards'
ORDER BY ordinal_position;

-- ========================================
-- 2. CHECK: What columns exist in curriculum_topics?
-- ========================================
SELECT 
    'curriculum_topics columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'curriculum_topics'
ORDER BY ordinal_position;

-- ========================================
-- 3. CHECK: Does get_topic_context function exist?
-- ========================================
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_topic_context';

-- ========================================
-- 4. CHECK: Does topic_overview_cards table exist?
-- ========================================
SELECT 
    'topic_overview_cards columns' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'topic_overview_cards'
ORDER BY ordinal_position;

-- ========================================
-- 5. CHECK: Sample topic to test hierarchy
-- ========================================
SELECT 
    'Sample topic for testing' as info,
    ct.id,
    ct.topic_name,
    ct.topic_level,
    ct.parent_topic_id,
    parent.topic_name as parent_name,
    COUNT(f.id) as card_count
FROM curriculum_topics ct
LEFT JOIN curriculum_topics parent ON parent.id = ct.parent_topic_id
LEFT JOIN flashcards f ON f.topic_id = ct.id
WHERE ct.topic_name ILIKE '%telling lies%'
GROUP BY ct.id, ct.topic_name, ct.topic_level, ct.parent_topic_id, parent.topic_name
LIMIT 5;

-- ========================================
-- 6. CHECK: Are there any cards with is_overview flag?
-- (This will error if column doesn't exist - that's diagnostic info!)
-- ========================================
-- Uncomment after confirming is_overview exists:
-- SELECT 
--     COUNT(*) FILTER (WHERE is_overview = TRUE) as overview_cards,
--     COUNT(*) FILTER (WHERE is_overview = FALSE) as regular_cards,
--     COUNT(*) as total_cards
-- FROM flashcards;

-- ========================================
-- SUMMARY: What we need to know
-- ========================================
-- 1. Does is_overview column exist in flashcards? (Check result #1)
-- 2. Does full_path column exist in curriculum_topics? (Check result #2)
-- 3. Does get_topic_context function exist? (Check result #3)
-- 4. Does topic_overview_cards table exist? (Check result #4)
-- 5. Can we find a test topic with cards? (Check result #5)

