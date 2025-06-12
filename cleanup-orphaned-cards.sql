-- 1. First, let's identify orphaned cards (cards with subjects that no longer exist for the user)
-- This query shows cards whose subjects are not in the user's current subject list
SELECT 
    f.id,
    f.subject_name,
    f.question,
    f.in_study_bank,
    f.box_number,
    f.created_at
FROM flashcards f
WHERE f.user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    AND f.subject_name NOT IN (
        SELECT DISTINCT subject_name 
        FROM user_subjects 
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    )
ORDER BY f.subject_name, f.created_at;

-- 2. Count orphaned cards by subject
SELECT 
    subject_name,
    COUNT(*) as orphaned_cards,
    COUNT(CASE WHEN in_study_bank = true THEN 1 END) as orphaned_in_study
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    AND subject_name NOT IN (
        SELECT DISTINCT subject_name 
        FROM user_subjects 
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    )
GROUP BY subject_name
ORDER BY subject_name;

-- 3. To fix: Remove orphaned cards from study bank
-- CAUTION: This will set in_study_bank = false for all orphaned cards
UPDATE flashcards
SET in_study_bank = false
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    AND subject_name NOT IN (
        SELECT DISTINCT subject_name 
        FROM user_subjects 
        WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    )
    AND in_study_bank = true;

-- 4. Alternative: Delete all orphaned cards completely
-- CAUTION: This will permanently delete the cards
-- DELETE FROM flashcards
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
--     AND subject_name NOT IN (
--         SELECT DISTINCT subject_name 
--         FROM user_subjects 
--         WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
--     ); 