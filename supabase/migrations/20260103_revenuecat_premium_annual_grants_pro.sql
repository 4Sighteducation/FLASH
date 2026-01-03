-- Grants Pro entitlement for a fixed window promo (tracked server-side).
-- This table is written by the RevenueCat webhook edge function.

create table if not exists public.revenuecat_promo_grants (
  user_id uuid primary key,
  promo_key text not null, -- e.g. premium_annual_grants_pro_v1
  source_product_id text not null, -- e.g. flash_premium_annual
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  rc_event_id text,
  rc_environment text,
  rc_raw jsonb
);

create index if not exists revenuecat_promo_grants_expires_idx
  on public.revenuecat_promo_grants (expires_at desc);

create index if not exists revenuecat_promo_grants_product_idx
  on public.revenuecat_promo_grants (source_product_id, granted_at desc);

alter table public.revenuecat_promo_grants enable row level security;
alter table public.revenuecat_promo_grants force row level security;

-- No public policies: service role (edge functions) can read/write; clients cannot.

