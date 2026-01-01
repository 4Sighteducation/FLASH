-- Test accounts + cleanup helpers (Supabase)
-- Use in Supabase SQL Editor. Review results before running deletes.

-- 0) Find vespa.academy test users (Auth)
-- NOTE: Deleting auth users is usually done via Auth dashboard or Admin API.
select id, email, created_at
from auth.users
where email ilike '%@vespa.academy'
order by created_at desc;

-- 1) Find the App Review + internal test users (Auth)
select id, email, created_at
from auth.users
where lower(email) in (
  'appletester@fl4sh.cards',
  'stu1@fl4sh.cards',
  'stu2@fl4sh.cards',
  'stu3@fl4sh.cards'
)
order by created_at desc;

-- 2) Grant tiers for those users via public.user_subscriptions (so Apple can review gated content)
-- Adjust column list if your table differs.
-- Set far-future expiration for reviewer/test accounts.
-- After running, verify in app (these emails are allowlisted to use DB tier if higher than RevenueCat).

-- appletester (Pro)
insert into public.user_subscriptions (user_id, tier, expires_at, updated_at)
select id, 'pro', '2035-01-01T00:00:00Z'::timestamptz, now()
from auth.users
where lower(email) = 'appletester@fl4sh.cards'
on conflict (user_id)
do update set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();

-- stu1 (Free)
insert into public.user_subscriptions (user_id, tier, expires_at, updated_at)
select id, 'free', null, now()
from auth.users
where lower(email) = 'stu1@fl4sh.cards'
on conflict (user_id)
do update set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();

-- stu2 (Premium)
insert into public.user_subscriptions (user_id, tier, expires_at, updated_at)
select id, 'premium', '2035-01-01T00:00:00Z'::timestamptz, now()
from auth.users
where lower(email) = 'stu2@fl4sh.cards'
on conflict (user_id)
do update set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();

-- stu3 (Pro)
insert into public.user_subscriptions (user_id, tier, expires_at, updated_at)
select id, 'pro', '2035-01-01T00:00:00Z'::timestamptz, now()
from auth.users
where lower(email) = 'stu3@fl4sh.cards'
on conflict (user_id)
do update set tier = excluded.tier, expires_at = excluded.expires_at, updated_at = now();

-- 3) Optional: delete rows in public tables for vespa.academy users (keep auth deletion manual)
-- WARNING: Only run if you're sure you want to remove test data.
-- This assumes most tables reference user_id; adapt to your schema.
/*
with victims as (
  select id as user_id
  from auth.users
  where email ilike '%@vespa.academy'
)
delete from public.user_subjects where user_id in (select user_id from victims);
*/



