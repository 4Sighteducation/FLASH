-- Establishments (schools/colleges) directory table.
-- This is a foundational table for future school-level features (bulk licensing, reporting, staff roles).
-- Safe, additive migration.

CREATE TABLE IF NOT EXISTS public.establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  name text NOT NULL,
  postcode text,

  -- Optional identifiers (useful if you later import official UK datasets)
  urn text,
  ukprn text,

  website text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Normalized name for searching/deduping workflows
  normalized_name text GENERATED ALWAYS AS (
    lower(regexp_replace(trim(name), '\s+', ' ', 'g'))
  ) STORED
);

-- Prefer hard-unique IDs when known (URN/UKPRN).
CREATE UNIQUE INDEX IF NOT EXISTS establishments_urn_unique
  ON public.establishments (urn)
  WHERE urn IS NOT NULL AND length(trim(urn)) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS establishments_ukprn_unique
  ON public.establishments (ukprn)
  WHERE ukprn IS NOT NULL AND length(trim(ukprn)) > 0;

-- Helps lookup when postcode is known (dedupe w/out forcing global uniqueness).
CREATE INDEX IF NOT EXISTS establishments_normalized_name_postcode_idx
  ON public.establishments (normalized_name, postcode);

-- Lock down by default (server uses service role).
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;

-- Link school_webinar_signups → establishments (optional).
ALTER TABLE public.school_webinar_signups
  ADD COLUMN IF NOT EXISTS establishment_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'school_webinar_signups_establishment_id_fkey'
  ) THEN
    ALTER TABLE public.school_webinar_signups
      ADD CONSTRAINT school_webinar_signups_establishment_id_fkey
      FOREIGN KEY (establishment_id)
      REFERENCES public.establishments (id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS school_webinar_signups_establishment_id_idx
  ON public.school_webinar_signups (establishment_id);

