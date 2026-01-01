-- Create public.user_subscriptions for v1 tiers (free/premium/pro) + legacy values (lite/full)
-- Run in Supabase SQL editor (qkapwhyxcpgzahuemucg)

create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('free','premium','pro','lite','full')),
  source text, -- e.g. revenuecat, admin, tester, legacy
  platform text check (platform in ('ios','android','web')),
  purchase_token text,
  purchased_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);

alter table public.user_subscriptions enable row level security;

-- Users can read their own tier
drop policy if exists "Users can view their own subscription" on public.user_subscriptions;
create policy "Users can view their own subscription"
  on public.user_subscriptions
  for select
  using (auth.uid() = user_id);

-- (Optional) allow users to upsert their own row (best-effort app sync).
-- If you’d rather lock this down to service-role/webhooks only, skip this policy.
drop policy if exists "Users can upsert their own subscription (best-effort)" on public.user_subscriptions;
create policy "Users can upsert their own subscription (best-effort)"
  on public.user_subscriptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own subscription (best-effort)" on public.user_subscriptions;
create policy "Users can update their own subscription (best-effort)"
  on public.user_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


