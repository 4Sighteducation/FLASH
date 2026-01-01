-- Migration: allow new tier model (free/premium/pro) while preserving legacy values (lite/full)
-- Run in Supabase SQL editor after inspecting current constraints.
-- NOTE: This script tries to be safe and idempotent, but constraint names vary per project.

-- 0) Optional: normalize existing rows first (legacy -> new)
-- Decide if you want this now. If you still rely on legacy 'lite/full' anywhere, skip this step.
-- update public.user_subscriptions set tier = 'free' where tier = 'lite';
-- update public.user_subscriptions set tier = 'pro'  where tier = 'full';

-- 1) Drop existing tier CHECK constraints (if present). You may need to adjust the constraint name.
-- First, run FLASH/scripts/inspect-user-subscriptions.sql to see the exact constraint name(s).
-- Example:
-- alter table public.user_subscriptions drop constraint if exists user_subscriptions_tier_check;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'user_subscriptions'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%tier%'
  loop
    execute format('alter table public.user_subscriptions drop constraint if exists %I', r.conname);
  end loop;
end $$;

-- 2) Add new CHECK constraint allowing both new and legacy values
alter table public.user_subscriptions
  add constraint user_subscriptions_tier_check_v2
  check (tier in ('free','premium','pro','lite','full'));

-- 3) (Optional but recommended) ensure the unique constraint on user_id exists
-- alter table public.user_subscriptions add constraint user_subscriptions_user_id_key unique (user_id);


