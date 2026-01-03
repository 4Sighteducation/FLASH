-- Add per-user setting to toggle Voice Answers in Study Mode.
-- Default: enabled (true).

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS voice_answers_in_study boolean NOT NULL DEFAULT true;

