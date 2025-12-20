-- Push Notifications: device token storage + user preferences
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

-- 1) Device tokens (Expo Push Tokens)
create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create unique index if not exists user_push_tokens_unique_token
  on public.user_push_tokens (expo_push_token);

create index if not exists user_push_tokens_user_id_idx
  on public.user_push_tokens (user_id);

-- 2) Notification preferences (kept small & extensible)
create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  push_enabled boolean not null default true,
  daily_due_cards_enabled boolean not null default true,
  daily_due_cards_hour integer not null default 18, -- 0-23 local hour
  timezone text not null default 'UTC',
  last_daily_due_cards_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3) Updated-at triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_notification_preferences_updated_at on public.user_notification_preferences;
create trigger trg_user_notification_preferences_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

-- 4) Row Level Security
alter table public.user_push_tokens enable row level security;
alter table public.user_notification_preferences enable row level security;

-- Token table policies (user can manage their own tokens)
drop policy if exists "user_push_tokens_select_own" on public.user_push_tokens;
create policy "user_push_tokens_select_own"
on public.user_push_tokens
for select
using (auth.uid() = user_id);

drop policy if exists "user_push_tokens_insert_own" on public.user_push_tokens;
create policy "user_push_tokens_insert_own"
on public.user_push_tokens
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_update_own" on public.user_push_tokens;
create policy "user_push_tokens_update_own"
on public.user_push_tokens
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_push_tokens_delete_own" on public.user_push_tokens;
create policy "user_push_tokens_delete_own"
on public.user_push_tokens
for delete
using (auth.uid() = user_id);

-- Preferences table policies (user can manage their own prefs)
drop policy if exists "user_notification_preferences_select_own" on public.user_notification_preferences;
create policy "user_notification_preferences_select_own"
on public.user_notification_preferences
for select
using (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_upsert_own" on public.user_notification_preferences;
create policy "user_notification_preferences_upsert_own"
on public.user_notification_preferences
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_notification_preferences_update_own" on public.user_notification_preferences;
create policy "user_notification_preferences_update_own"
on public.user_notification_preferences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 5) RPC: compute daily due-cards push targets (service role use)
create or replace function public.get_due_cards_push_targets(p_limit integer default 500)
returns table (
  user_id uuid,
  expo_push_token text,
  timezone text,
  daily_due_cards_hour integer,
  last_daily_due_cards_sent_at timestamptz,
  due_count integer
)
language sql
stable
as $$
  with active_tokens as (
    select upt.user_id, upt.expo_push_token
    from public.user_push_tokens upt
    where upt.enabled = true
  ),
  prefs as (
    select
      p.user_id,
      p.timezone,
      p.daily_due_cards_hour,
      p.last_daily_due_cards_sent_at
    from public.user_notification_preferences p
    where p.push_enabled = true
      and p.daily_due_cards_enabled = true
  ),
  candidates as (
    select
      t.user_id,
      t.expo_push_token,
      p.timezone,
      p.daily_due_cards_hour,
      p.last_daily_due_cards_sent_at
    from active_tokens t
    join prefs p on p.user_id = t.user_id
    where extract(hour from (now() at time zone p.timezone))::int = p.daily_due_cards_hour
      and (
        p.last_daily_due_cards_sent_at is null
        or date(p.last_daily_due_cards_sent_at at time zone p.timezone) < date(now() at time zone p.timezone)
      )
  )
  select
    c.user_id,
    c.expo_push_token,
    c.timezone,
    c.daily_due_cards_hour,
    c.last_daily_due_cards_sent_at,
    (
      select count(*)
      from public.flashcards f
      where f.user_id = c.user_id
        and f.in_study_bank = true
        and coalesce(f.next_review_date, now()) <= now()
        and f.subject_name in (
          select s.subject.subject_name
          from public.user_subjects us
          join public.exam_board_subjects s on s.id = us.subject_id
          where us.user_id = c.user_id
        )
    )::int as due_count
  from candidates c
  where (
    select count(*)
    from public.flashcards f
    where f.user_id = c.user_id
      and f.in_study_bank = true
      and coalesce(f.next_review_date, now()) <= now()
      and f.subject_name in (
        select s.subject.subject_name
        from public.user_subjects us
        join public.exam_board_subjects s on s.id = us.subject_id
        where us.user_id = c.user_id
      )
  ) > 0
  limit p_limit;
$$;

revoke all on function public.get_due_cards_push_targets(integer) from anon, authenticated;
grant execute on function public.get_due_cards_push_targets(integer) to service_role;


