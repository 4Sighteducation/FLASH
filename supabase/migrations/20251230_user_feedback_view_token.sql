-- ================================================================
-- Feedback screenshot view token (for short links from email)
-- ================================================================

ALTER TABLE public.user_feedback
ADD COLUMN IF NOT EXISTS view_token UUID DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_user_feedback_view_token
ON public.user_feedback(view_token);


