-- Waitlist conversion tracking + feedback email tracking
-- 2026-01-21
--
-- Goals:
-- 1) Track when a waitlist email becomes a real auth account ("converted").
-- 2) Auto-mark waitlist "notified" when converted (so launch/waitlist comms don't target them anymore).
-- 3) Preserve existing Top-N 1-year Pro auto-grant behavior for eligible waitlisters.
-- 4) Track whether we've sent a separate "feedback form" email to a waitlist contact.

-- 1) Schema additions
alter table public.waitlist
  add column if not exists converted_at timestamptz,
  add column if not exists converted_user_id uuid references auth.users(id) on delete set null,
  add column if not exists feedback_notified boolean not null default false,
  add column if not exists feedback_notified_at timestamptz;

create index if not exists idx_waitlist_converted_user_id on public.waitlist (converted_user_id);
create index if not exists idx_waitlist_converted_at on public.waitlist (converted_at);
create index if not exists idx_waitlist_feedback_notified on public.waitlist (feedback_notified);

-- 2) Update existing trigger function to ALSO stamp conversion + notified
--    (keep the existing trigger name; just replace function body).
create or replace function public.waitlist_auto_pro_on_auth_user_insert()
returns trigger as $$
declare
  wl record;
  eligible boolean;
  days_to_grant integer;
  exp timestamptz;
begin
  if new.email is null then
    return new;
  end if;

  -- Find earliest waitlist row for this email (regardless of eligibility)
  select *
  into wl
  from public.waitlist
  where lower(email) = lower(new.email)
  order by created_at asc
  limit 1;

  if wl.id is null then
    return new;
  end if;

  -- Always stamp conversion, and mark notified=true (per product requirement)
  begin
    update public.waitlist
    set converted_at = coalesce(converted_at, now()),
        converted_user_id = coalesce(converted_user_id, new.id),
        notified = true
    where id = wl.id;
  exception when others then
    -- Never block signup if anything goes wrong while stamping conversion.
    return new;
  end;

  -- Keep legacy eligibility logic: Top-N (is_top_twenty) OR auto_pro_enabled.
  eligible := (wl.is_top_twenty = true) or (wl.auto_pro_enabled = true);
  if not eligible then
    return new;
  end if;

  -- Idempotency: do not double-grant
  if wl.auto_pro_granted_at is not null then
    return new;
  end if;

  days_to_grant := greatest(coalesce(wl.auto_pro_days, 365), 1);
  exp := now() + make_interval(days => days_to_grant);

  -- Never block signup if anything goes wrong while granting.
  begin
    perform public.grant_pro_to_user(new.id, exp, 'waitlist_auto', 'waitlist_auto');
  exception when others then
    return new;
  end;

  update public.waitlist
  set auto_pro_granted_at = coalesce(auto_pro_granted_at, now()),
      auto_pro_granted_user_id = coalesce(auto_pro_granted_user_id, new.id)
  where id = wl.id;

  return new;
end;
$$ language plpgsql security definer;

alter function public.waitlist_auto_pro_on_auth_user_insert() set search_path = public;

-- 3) Backfill conversion fields for previously auto-granted waitlisters
update public.waitlist
set converted_at = coalesce(converted_at, auto_pro_granted_at),
    converted_user_id = coalesce(converted_user_id, auto_pro_granted_user_id),
    notified = true
where auto_pro_granted_user_id is not null;

-- 4) Extend user_email_events types so admin tooling can log feedback outreach.
-- Existing constraint was created inline and may have an auto-generated name; drop any check constraints mentioning "type in".
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.user_email_events'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%type in%'
  loop
    execute format('alter table public.user_email_events drop constraint %I', r.conname);
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_email_events'::regclass
      and conname = 'user_email_events_type_check'
  ) then
    alter table public.user_email_events
      add constraint user_email_events_type_check
      check (type in ('welcome','feedback_request'));
  end if;
end $$;

