-- Inspect current schema for public.user_subscriptions (columns + constraints + allowed tier values)
-- Run in Supabase SQL editor for project: qkapwhyxcpgzahuemucg

-- 1) Confirm table exists + columns
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'user_subscriptions'
order by ordinal_position;

-- 2) Show constraints (PK/UK/FK/CHECK)
select
  conname,
  contype,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'user_subscriptions'
order by contype, conname;

-- 3) If there is a CHECK constraint for tier, find it explicitly
select
  conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'user_subscriptions'
  and c.contype = 'c'
order by conname;

-- 4) Quick sanity: distribution of tiers currently stored
select tier, count(*) as n
from public.user_subscriptions
group by tier
order by n desc;


