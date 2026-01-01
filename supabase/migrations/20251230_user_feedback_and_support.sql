-- ================================================================
-- User Feedback + Support (email + DB record + screenshot storage)
-- ================================================================

-- 1) Feedback table (support triage)
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  tier TEXT,

  -- Context
  source_route_name TEXT,
  source_route_params JSONB,
  context_title TEXT,
  context_hint TEXT,
  category TEXT,
  urgency TEXT,
  is_priority BOOLEAN NOT NULL DEFAULT FALSE,

  subject_id UUID,
  topic_id UUID,

  -- Message
  message TEXT NOT NULL,

  -- Screenshot reference (stored in Supabase Storage)
  screenshot_bucket TEXT,
  screenshot_path TEXT,
  screenshot_mime TEXT,
  screenshot_size_bytes INT,

  -- Device/app metadata
  platform TEXT,
  os_version TEXT,
  device_model TEXT,
  app_version TEXT,
  app_build TEXT,

  -- Arbitrary extra metadata (errors, feature flags, etc.)
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_priority ON public.user_feedback(is_priority) WHERE is_priority = true;

-- RLS: users can view their own feedback; inserts are via Edge Function (service role).
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Drop & recreate policies for idempotency across environments
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own feedback" ON public.user_feedback';
  EXECUTE 'CREATE POLICY "Users can view own feedback" ON public.user_feedback FOR SELECT USING (auth.uid() = user_id)';
END $$;

-- 2) Storage bucket for screenshots
-- Create a private bucket so objects are not publicly accessible.
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for Storage objects (bucket-scoped, path scoped):
-- Convention: object name = "{userId}/{fileName}"
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Users can upload feedback screenshots" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can read own feedback screenshots" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Users can delete own feedback screenshots" ON storage.objects';

  EXECUTE $p$
    CREATE POLICY "Users can upload feedback screenshots"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'feedback-screenshots'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  $p$;

  EXECUTE $p$
    CREATE POLICY "Users can read own feedback screenshots"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'feedback-screenshots'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  $p$;

  EXECUTE $p$
    CREATE POLICY "Users can delete own feedback screenshots"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'feedback-screenshots'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  $p$;
END $$;


