-- RUN THESE QUERIES AND SHARE THE RESULTS

-- 1. How many rows in cleaned_topics?
SELECT COUNT(*) as total_cleaned_topics FROM cleaned_topics;

-- 2. Breakdown by exam board and type
SELECT 
    exam_board,
    exam_type,
    COUNT(*) as row_count
FROM cleaned_topics
GROUP BY exam_board, exam_type
ORDER BY exam_board, exam_type;

-- 3. Current curriculum_topics count
SELECT COUNT(*) as current_curriculum_topics FROM curriculum_topics;

-- 4. Current user_topics count (to see if we'll lose data)
SELECT COUNT(*) as current_user_topics FROM user_topics;

-- 5. Current flashcards count
SELECT COUNT(*) as current_flashcards FROM flashcards;

-- 6. Sample of cleaned_topics data
SELECT * FROM cleaned_topics LIMIT 5; 