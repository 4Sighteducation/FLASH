-- Pro-only: 30-day free Pro access (no payment method) + expiry hard-wipe
-- Safe to run multiple times where possible.

-- 0) Ensure baseline table exists (older environments may have created this manually).
create table if not exists public.user_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tier text not null,
  platform text,
  purchase_token text,
  purchased_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- 1) Expand tier constraint to support current + legacy values (we will treat premium as pro in-app during transition).
alter table public.user_subscriptions drop constraint if exists user_subscriptions_tier_check;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_tier_check1;
alter table public.user_subscriptions
  add constraint user_subscriptions_tier_check
  check (tier in ('free','pro','premium','lite','full'));

-- 2) Add trial lifecycle fields
alter table public.user_subscriptions
  add column if not exists source text,
  add column if not exists started_at timestamptz,
  add column if not exists trial_used_at timestamptz,
  add column if not exists expired_processed_at timestamptz,
  add column if not exists trial_last_warning_days_remaining integer,
  add column if not exists trial_last_warning_sent_at timestamptz;

-- Ensure unique index (some envs have only a UNIQUE constraint)
create unique index if not exists user_subscriptions_user_id_uidx on public.user_subscriptions(user_id);
create index if not exists user_subscriptions_expires_at_idx on public.user_subscriptions(expires_at);
create index if not exists user_subscriptions_source_idx on public.user_subscriptions(source);

alter table public.user_subscriptions enable row level security;

-- Users can view their own row (for app to read trial expiry)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and policyname = 'Users can view own subscription row'
  ) then
    create policy "Users can view own subscription row"
      on public.user_subscriptions
      for select
      using (auth.uid() = user_id);
  end if;
end $$;

-- Service role can manage
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_subscriptions'
      and policyname = 'Service role can manage user_subscriptions'
  ) then
    create policy "Service role can manage user_subscriptions"
      on public.user_subscriptions
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- 3) Start trial on first real use (authenticated RPC)
create or replace function public.ensure_pro_trial_started()
returns table (tier text, source text, started_at timestamptz, expires_at timestamptz, trial_used_at timestamptz)
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_role text;
  v_existing record;
  v_now timestamptz := now();
  v_expires timestamptz := now() + interval '30 days';
  v_has_beta boolean := false;
begin
  v_role := coalesce(auth.jwt()->>'role', '');
  if v_role = 'service_role' then
    raise exception 'Forbidden';
  end if;

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- If they already have beta access, don't start a trial clock (beta_access already has expiry).
  begin
    select true into v_has_beta
    from public.beta_access ba
    where ba.user_id = v_user_id
      and (ba.expires_at is null or ba.expires_at >= v_now)
    limit 1;
  exception when undefined_table then
    v_has_beta := false;
  end;

  -- Ensure a row exists
  insert into public.user_subscriptions (user_id, tier, source, started_at, expires_at, trial_used_at, created_at, updated_at)
  values (v_user_id, 'free', null, null, null, null, v_now, v_now)
  on conflict (user_id) do nothing;

  select * into v_existing
  from public.user_subscriptions
  where user_id = v_user_id;

  -- If trial already consumed, just return current row fields
  if v_existing.trial_used_at is not null then
    return query
      select v_existing.tier, v_existing.source, v_existing.started_at, v_existing.expires_at, v_existing.trial_used_at;
    return;
  end if;

  -- If they already have paid Pro recorded (source not trial and expires_at in future), do not start trial.
  if v_existing.tier in ('pro','premium') and v_existing.source is not null and v_existing.source <> 'trial' then
    return query
      select v_existing.tier, v_existing.source, v_existing.started_at, v_existing.expires_at, v_existing.trial_used_at;
    return;
  end if;

  if v_has_beta then
    -- Beta covers them; mark trial as "used" to avoid stacking if you want, but here we leave it unused.
    return query
      select v_existing.tier, v_existing.source, v_existing.started_at, v_existing.expires_at, v_existing.trial_used_at;
    return;
  end if;

  -- Start the 30-day Pro access window
  update public.user_subscriptions
  set
    tier = 'pro',
    source = 'trial',
    started_at = v_now,
    expires_at = v_expires,
    trial_used_at = v_now,
    updated_at = v_now
  where user_id = v_user_id;

  return query
    select 'pro'::text, 'trial'::text, v_now, v_expires, v_now;
end;
$$;

alter function public.ensure_pro_trial_started() set search_path = public;
revoke all on function public.ensure_pro_trial_started() from public, anon;
grant execute on function public.ensure_pro_trial_started() to authenticated;

-- 4) Hard-wipe (service role only): delete study data but keep the auth account.
create or replace function public.hard_wipe_user_study_data(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  v_role := coalesce(auth.jwt()->>'role', '');
  if v_role <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_user_id is null then
    raise exception 'Missing user';
  end if;

  -- Delete rows in safest order (children first). Each block is tolerant to schema drift.
  begin delete from public.card_reviews where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.study_sessions where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.flashcards where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.user_topics where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.user_subjects where user_id = p_user_id; exception when undefined_table then null; end;

  begin delete from public.user_settings where user_id = p_user_id; exception when undefined_table then null; end;

  begin delete from public.paper_progress where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.paper_question_xp_awards where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.paper_xp_awards where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.student_attempts where user_id = p_user_id; exception when undefined_table then null; end;

  -- Reset stats (or delete; ensure_user_profile can recreate)
  begin delete from public.user_stats where user_id = p_user_id; exception when undefined_table then null; end;

  -- Optional: clear topic preferences / daily study tables if present
  begin delete from public.topic_study_preferences where user_id = p_user_id; exception when undefined_table then null; end;
  begin delete from public.daily_study_cards where user_id = p_user_id; exception when undefined_table then null; end;

  -- If you use user-topic priorities, clear them too
  begin delete from public.user_topic_priorities where user_id = p_user_id; exception when undefined_table then null; end;
end;
$$;

alter function public.hard_wipe_user_study_data(uuid) set search_path = public;
revoke all on function public.hard_wipe_user_study_data(uuid) from public, anon, authenticated;
grant execute on function public.hard_wipe_user_study_data(uuid) to service_role;

-- 5) Process expiry (service role only): wipe + downgrade to Free exactly once
create or replace function public.process_expired_trial_user(p_user_id uuid)
returns table (ok boolean, reason text)
language plpgsql
security definer
as $$
declare
  v_role text;
  v_now timestamptz := now();
  v_sub record;
  v_has_beta boolean := false;
begin
  v_role := coalesce(auth.jwt()->>'role', '');
  if v_role <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select * into v_sub
  from public.user_subscriptions
  where user_id = p_user_id;

  if v_sub.user_id is null then
    return query select false, 'missing_subscription_row';
    return;
  end if;

  -- Only process trial rows
  if coalesce(v_sub.source, '') <> 'trial' then
    return query select false, 'not_trial_source';
    return;
  end if;

  if v_sub.expired_processed_at is not null then
    return query select true, 'already_processed';
    return;
  end if;

  if v_sub.expires_at is null or v_sub.expires_at > v_now then
    return query select false, 'not_expired';
    return;
  end if;

  -- If they have beta access, don't wipe.
  begin
    select true into v_has_beta
    from public.beta_access ba
    where ba.user_id = p_user_id
      and (ba.expires_at is null or ba.expires_at >= v_now)
    limit 1;
  exception when undefined_table then
    v_has_beta := false;
  end;
  if v_has_beta then
    return query select false, 'has_beta_access';
    return;
  end if;

  -- Wipe content
  perform public.hard_wipe_user_study_data(p_user_id);

  -- Downgrade to Free
  update public.user_subscriptions
  set
    tier = 'free',
    source = 'free',
    expired_processed_at = v_now,
    updated_at = v_now
  where user_id = p_user_id;

  return query select true, 'wiped_and_downgraded';
end;
$$;

alter function public.process_expired_trial_user(uuid) set search_path = public;
revoke all on function public.process_expired_trial_user(uuid) from public, anon, authenticated;
grant execute on function public.process_expired_trial_user(uuid) to service_role;

-- 6) Helper RPC: fetch warning targets (service role only)
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
      and us.expires_at >= now() - interval '1 day' -- ignore long-expired (handled by expiry processing)
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
  where e.days_remaining in (20, 10, 3, 2, 1, 0)
    and not (
      e.trial_last_warning_days_remaining = e.days_remaining
      and e.trial_last_warning_sent_at is not null
      and e.trial_last_warning_sent_at > now() - interval '18 hours'
    )
  limit p_limit;
$$;

revoke all on function public.get_trial_expiry_push_targets(integer) from anon, authenticated;
grant execute on function public.get_trial_expiry_push_targets(integer) to service_role;

-- 7) Helper RPC: fetch expired users (service role only)
create or replace function public.get_expired_trial_users(p_limit integer default 500)
returns table (user_id uuid)
language sql
stable
as $$
  select us.user_id
  from public.user_subscriptions us
  left join public.beta_access ba
    on ba.user_id = us.user_id
    and (ba.expires_at is null or ba.expires_at >= now())
  where us.source = 'trial'
    and us.expires_at is not null
    and us.expires_at <= now()
    and us.expired_processed_at is null
    and ba.user_id is null
  limit p_limit;
$$;

revoke all on function public.get_expired_trial_users(integer) from anon, authenticated;
grant execute on function public.get_expired_trial_users(integer) to service_role;

