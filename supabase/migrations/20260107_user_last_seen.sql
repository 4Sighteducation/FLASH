-- Lightweight device + country telemetry for admin analytics (no GPS).
-- Populated by Edge Function `telemetry-ping` on sign-in/launch.

create table if not exists public.user_last_seen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),

  -- Device/app metadata (best-effort, may be null)
  platform text,
  app_version text,
  build_version text,
  device_model text,
  os_name text,
  os_version text,
  locale text,
  timezone text,

  -- Country inferred from request headers when available (e.g. Cloudflare); otherwise null
  country text,
  country_source text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_last_seen_last_seen_at_idx on public.user_last_seen (last_seen_at desc);
create index if not exists user_last_seen_country_idx on public.user_last_seen (country);

alter table public.user_last_seen enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_last_seen' and policyname='Users can view their own last seen'
  ) then
    create policy "Users can view their own last seen"
      on public.user_last_seen
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='user_last_seen' and policyname='Service role can manage user last seen'
  ) then
    create policy "Service role can manage user last seen"
      on public.user_last_seen
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- updated_at trigger (reuses shared helper if present)
drop trigger if exists user_last_seen_set_updated_at on public.user_last_seen;
create trigger user_last_seen_set_updated_at
before update on public.user_last_seen
for each row execute function public.set_updated_at();

