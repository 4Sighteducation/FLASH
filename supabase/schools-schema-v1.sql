-- Schools schema (v1): one school per user
-- Run in Supabase SQL editor (qkapwhyxcpgzahuemucg) when you're ready.

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  main_contact_name text,
  main_contact_email text,
  main_contact_phone text,
  logo_url text,
  terms text, -- e.g. "bulk annual", "voucher", notes
  student_count integer,
  discount_percent numeric(5,2), -- e.g. 15.00
  level text check (level in ('gcse','alevel','both','igcse')) default 'both',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One school per user: attach to your existing profile table.
-- Your DB currently has public.users (not public.user_profiles).
alter table public.users
  add column if not exists school_id uuid references public.schools(id) on delete set null;

create index if not exists idx_users_school_id on public.users(school_id);
create index if not exists idx_schools_name on public.schools(lower(name));

-- Simple "activity" table to support minutes studied, papers attempted, etc.
-- You may already have study_sessions and paper_progress; this is optional.
create table if not exists public.user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  minutes_studied integer not null default 0,
  cards_created integer not null default 0,
  papers_attempted integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Useful rollup queries (examples)
-- 1) Minutes studied last 7 days (overall)
-- select sum(minutes_studied) as minutes_7d from public.user_activity_daily where day >= current_date - 7;
--
-- 2) By school (last 30 days)
-- select s.name, sum(uad.minutes_studied) as minutes_30d
-- from public.user_activity_daily uad
-- join public.users u on u.id = uad.user_id
-- join public.schools s on s.id = u.school_id
-- where uad.day >= current_date - 30
-- group by s.name
-- order by minutes_30d desc;


