-- Step 3: Add Indexes for Better Performance
-- These will speed up queries significantly

-- Add indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON public.flashcards(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON public.flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_card_reviews_flashcard_id ON public.card_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_card_reviews_user_id ON public.card_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_user_id ON public.user_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topics_topic_id ON public.user_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_exam_board_subject_id ON public.curriculum_topics(exam_board_subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_parent_topic_id ON public.curriculum_topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_exam_board_subjects_exam_board_id ON public.exam_board_subjects(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_topics_user_id ON public.user_custom_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_topics_subject_id ON public.user_custom_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_id ON public.user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_subject_id ON public.user_subjects(subject_id);

-- Show which indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
    
    RAISE NOTICE 'Total indexes in public schema: %', index_count;
END $$; 