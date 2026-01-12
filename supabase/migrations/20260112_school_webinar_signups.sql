-- School webinar signups (staff) for FL4SH x VESPA Academy outreach.
-- Captures basic details + allows emailing a booking link.
-- Safe, additive migration.

CREATE TABLE IF NOT EXISTS public.school_webinar_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Staff contact details
  staff_name text NOT NULL,
  staff_email text NOT NULL,
  staff_role text,
  establishment_name text,

  -- Marketing / source tracking
  source text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Email status tracking
  booking_link_status text NOT NULL DEFAULT 'pending',
  booking_link_sent_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'school_webinar_signups_booking_link_status_check'
  ) THEN
    ALTER TABLE public.school_webinar_signups
      ADD CONSTRAINT school_webinar_signups_booking_link_status_check
      CHECK (booking_link_status IN ('pending','sent','failed'));
  END IF;
END $$;

-- Prevent accidental duplicates (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS school_webinar_signups_staff_email_unique
  ON public.school_webinar_signups ((lower(staff_email)));

-- Lock down by default (server uses service role).
ALTER TABLE public.school_webinar_signups ENABLE ROW LEVEL SECURITY;

