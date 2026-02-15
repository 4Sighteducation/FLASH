-- Add trial reminder emails (halfway + 3 days) and adjust push reminder schedule.
-- Safe to run multiple times.

-- 1) Expand user_email_events allowed types.
do $$
declare
  r record;
begin
  -- Drop any existing type check constraint (name varies across environments).
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
      check (
        type in (
          'welcome',
          'feedback_request',
          'trial_halfway',
          'trial_expiring_3d'
        )
      );
  else
    -- Recreate with the expanded set
    alter table public.user_email_events drop constraint user_email_events_type_check;
    alter table public.user_email_events
      add constraint user_email_events_type_check
      check (
        type in (
          'welcome',
          'feedback_request',
          'trial_halfway',
          'trial_expiring_3d'
        )
      );
  end if;
end $$;

-- 2) Push reminder targets: focus on halfway + 3 days (and keep 1/day-of safety).
create or replace function public.get_trial_expiry_push_targets(p_limit integer default 500)
returns table (
  user_id uuid,
  expo_push_token text,
  days_remaining integer,
  expires_at timestamptz
)
language sql
stable
as $$
  with trial_users as (
    select
      us.user_id,
      us.expires_at,
      us.trial_last_warning_days_remaining,
      us.trial_last_warning_sent_at
    from public.user_subscriptions us
    where us.source = 'trial'
      and us.expires_at is not null
      and us.expired_processed_at is null
      and us.expires_at >= now() - interval '1 day'
  ),
  active_tokens as (
    select upt.user_id, upt.expo_push_token
    from public.user_push_tokens upt
    where upt.enabled = true
  ),
  prefs as (
    select p.user_id
    from public.user_notification_preferences p
    where p.push_enabled = true
  ),
  eligible as (
    select
      t.user_id,
      t.expo_push_token,
      tr.expires_at,
      greatest(0, ceil(extract(epoch from (tr.expires_at - now())) / 86400.0))::int as days_remaining,
      tr.trial_last_warning_days_remaining,
      tr.trial_last_warning_sent_at
    from trial_users tr
    join active_tokens t on t.user_id = tr.user_id
    join prefs p on p.user_id = tr.user_id
    left join public.beta_access ba
      on ba.user_id = tr.user_id
      and (ba.expires_at is null or ba.expires_at >= now())
    where ba.user_id is null
  )
  select
    e.user_id,
    e.expo_push_token,
    e.days_remaining,
    e.expires_at
  from eligible e
  where e.days_remaining in (15, 3, 1, 0)
    and not (
      e.trial_last_warning_days_remaining = e.days_remaining
      and e.trial_last_warning_sent_at is not null
      and e.trial_last_warning_sent_at > now() - interval '18 hours'
    )
  limit p_limit;
$$;

revoke all on function public.get_trial_expiry_push_targets(integer) from anon, authenticated;
grant execute on function public.get_trial_expiry_push_targets(integer) to service_role;

-- 3) Email reminder targets for trial users (service role only).
create or replace function public.get_trial_reminder_email_targets(p_limit integer default 500)
returns table (
  user_id uuid,
  email text,
  username text,
  days_remaining integer,
  expires_at timestamptz,
  reminder_type text
)
language sql
stable
as $$
  with trial_users as (
    select
      us.user_id,
      us.expires_at,
      greatest(0, ceil(extract(epoch from (us.expires_at - now())) / 86400.0))::int as days_remaining
    from public.user_subscriptions us
    left join public.beta_access ba
      on ba.user_id = us.user_id
      and (ba.expires_at is null or ba.expires_at >= now())
    where us.source = 'trial'
      and us.expires_at is not null
      and us.expired_processed_at is null
      and us.expires_at > now() - interval '1 day'
      and ba.user_id is null
  ),
  users as (
    select u.id as user_id, u.email, u.username
    from public.users u
    where u.email is not null and length(trim(u.email)) > 0
  ),
  candidates as (
    select
      tu.user_id,
      u.email,
      u.username,
      tu.days_remaining,
      tu.expires_at,
      case
        when tu.days_remaining = 15 then 'trial_halfway'
        when tu.days_remaining = 3 then 'trial_expiring_3d'
        else null
      end as reminder_type
    from trial_users tu
    join users u on u.user_id = tu.user_id
    where tu.days_remaining in (15, 3)
  )
  select c.user_id, c.email, c.username, c.days_remaining, c.expires_at, c.reminder_type
  from candidates c
  where c.reminder_type is not null
    and not exists (
      select 1
      from public.user_email_events ev
      where ev.user_id = c.user_id
        and ev.type = c.reminder_type
        and ev.status in ('sending','sent')
    )
  order by c.days_remaining asc, c.expires_at asc
  limit p_limit;
$$;

revoke all on function public.get_trial_reminder_email_targets(integer) from anon, authenticated;
grant execute on function public.get_trial_reminder_email_targets(integer) to service_role;

