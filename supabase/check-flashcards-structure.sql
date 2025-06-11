-- Check the current structure of the flashcards table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
ORDER BY ordinal_position;

-- Check if difficulty column exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'flashcards' 
    AND column_name = 'difficulty'
) as difficulty_exists; 