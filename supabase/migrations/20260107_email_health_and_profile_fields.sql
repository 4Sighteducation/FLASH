-- Track email delivery outcomes (SendGrid webhook) + collect optional user info
-- Safe, additive migration.

-- 1) Add optional outreach fields to public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS school_name text;

-- 2) Add delivery outcome fields to public.user_email_events
ALTER TABLE public.user_email_events
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS delivery_event_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_error text,
  ADD COLUMN IF NOT EXISTS sendgrid_message_id text,
  ADD COLUMN IF NOT EXISTS sendgrid_event_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_email_events_delivery_status_check'
  ) THEN
    ALTER TABLE public.user_email_events
      ADD CONSTRAINT user_email_events_delivery_status_check
      CHECK (delivery_status IN ('unknown','processed','delivered','deferred','bounce','dropped','blocked','spamreport'));
  END IF;
END $$;

