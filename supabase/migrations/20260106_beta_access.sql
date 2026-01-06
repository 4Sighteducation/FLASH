-- Beta access allowlist (free Pro/Premium access for testers/launch promo)
-- This is intentionally separate from RevenueCat so we can manage a server-side allowlist.

create table if not exists public.beta_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  tier text not null default 'pro' check (tier in ('premium', 'pro')),
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beta_access_email_idx on public.beta_access (lower(email));
create index if not exists beta_access_expires_at_idx on public.beta_access (expires_at);

alter table public.beta_access enable row level security;

-- Allow signed-in users to read their own beta access (useful for UI/debugging)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beta_access'
      and policyname = 'Users can view their own beta access'
  ) then
    create policy "Users can view their own beta access"
      on public.beta_access
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Service role can manage (insert/update/delete)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'beta_access'
      and policyname = 'Service role can manage beta access'
  ) then
    create policy "Service role can manage beta access"
      on public.beta_access
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- Keep updated_at fresh (create if missing; safe to re-run)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists beta_access_set_updated_at on public.beta_access;
create trigger beta_access_set_updated_at
before update on public.beta_access
for each row execute function public.set_updated_at();

