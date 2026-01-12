-- Add CRM-friendly columns to public.establishments (import from crm_schools_rows.csv).
-- Safe, additive migration.

ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS establishment_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS local_authority text,
  ADD COLUMN IF NOT EXISTS urban_rural text,
  ADD COLUMN IF NOT EXISTS phase_of_education text,
  ADD COLUMN IF NOT EXISTS high_age int,
  ADD COLUMN IF NOT EXISTS ofsted_rating text,
  ADD COLUMN IF NOT EXISTS ofsted_date date,
  ADD COLUMN IF NOT EXISTS ofsted_report_url text,
  ADD COLUMN IF NOT EXISTS establishment_type text,
  ADD COLUMN IF NOT EXISTS establishment_type_group text,
  ADD COLUMN IF NOT EXISTS denomination text,
  ADD COLUMN IF NOT EXISTS address_street_1 text,
  ADD COLUMN IF NOT EXISTS address_street_2 text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS primary_email text,
  ADD COLUMN IF NOT EXISTS academy_trust_id uuid,
  ADD COLUMN IF NOT EXISTS trust_name text,
  ADD COLUMN IF NOT EXISTS customer_status text,
  ADD COLUMN IF NOT EXISTS is_existing_customer boolean,
  ADD COLUMN IF NOT EXISTS number_of_pupils int;

-- Prefer not-null-ish establishment_name when present (keep name as the canonical display field).
DO $$
BEGIN
  -- No-op: left here to keep migration intentionally additive without touching existing rows.
END $$;

CREATE INDEX IF NOT EXISTS establishments_region_idx ON public.establishments (region);
CREATE INDEX IF NOT EXISTS establishments_local_authority_idx ON public.establishments (local_authority);
CREATE INDEX IF NOT EXISTS establishments_trust_name_idx ON public.establishments (trust_name);
CREATE INDEX IF NOT EXISTS establishments_customer_status_idx ON public.establishments (customer_status);

