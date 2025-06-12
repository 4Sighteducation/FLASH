-- 1. Get all flashcards for the user with their study status
SELECT 
    id,
    subject_name,
    topic,
    question,
    in_study_bank,
    box_number,
    next_review_date,
    created_at
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
ORDER BY subject_name, created_at DESC;

-- 2. Count cards by study status
SELECT 
    COUNT(*) as total_cards,
    COUNT(CASE WHEN in_study_bank = true THEN 1 END) as cards_in_study,
    COUNT(CASE WHEN in_study_bank = false OR in_study_bank IS NULL THEN 1 END) as cards_not_in_study
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy');

-- 3. Count cards by subject and study status
SELECT 
    subject_name,
    COUNT(*) as total_cards,
    COUNT(CASE WHEN in_study_bank = true THEN 1 END) as in_study,
    COUNT(CASE WHEN in_study_bank = false OR in_study_bank IS NULL THEN 1 END) as not_in_study
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
GROUP BY subject_name
ORDER BY subject_name;

-- 4. Check for any duplicate cards or anomalies
SELECT 
    question,
    COUNT(*) as duplicate_count,
    array_agg(id) as card_ids,
    array_agg(in_study_bank) as study_statuses
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
GROUP BY question
HAVING COUNT(*) > 1;

-- 5. Get cards by box number for study mode
SELECT 
    box_number,
    COUNT(*) as card_count,
    array_agg(DISTINCT subject_name) as subjects
FROM flashcards
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@vespa.academy')
    AND (in_study_bank = true OR in_study_bank IS NULL)
GROUP BY box_number
ORDER BY box_number; 