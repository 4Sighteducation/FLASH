-- Protected test/internal accounts that should never lose Pro.
-- - Creates a simple rule table (match by email, domain, or user_id).
-- - Auto-applies protection on signup (auth.users insert trigger).
-- - Backfills existing matching users.
-- - Ensures trial-expiry sweeps never wipe/downgrade protected users.

create table if not exists public.protected_access_rules (
  id uuid primary key default gen_random_uuid(),
  match_type text not null check (match_type in ('email', 'domain', 'user_id')),
  match_value text not null,
  tier text not null default 'pro' check (tier in ('pro')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_type, match_value)
);

create index if not exists protected_access_rules_match_idx
  on public.protected_access_rules (match_type, match_value);

alter table public.protected_access_rules enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'protected_access_rules'
      and policyname = 'Service role can manage protected access rules'
  ) then
    create policy "Service role can manage protected access rules"
      on public.protected_access_rules
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- Keep updated_at fresh (reuses shared helper if present; define if missing)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists protected_access_rules_set_updated_at on public.protected_access_rules;
create trigger protected_access_rules_set_updated_at
before update on public.protected_access_rules
for each row execute function public.set_updated_at();


-- Resolve whether a user is protected by rules.
create or replace function public.is_protected_user(p_user_id uuid, p_email text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_domain text;
begin
  if p_user_id is null then
    return false;
  end if;

  if exists (
    select 1
    from public.protected_access_rules r
    where r.match_type = 'user_id'
      and r.match_value = p_user_id::text
  ) then
    return true;
  end if;

  v_email := lower(nullif(trim(coalesce(p_email, (select u.email from auth.users u where u.id = p_user_id))), ''));
  if v_email is null then
    return false;
  end if;

  if exists (
    select 1
    from public.protected_access_rules r
    where r.match_type = 'email'
      and r.match_value = v_email
  ) then
    return true;
  end if;

  v_domain := nullif(split_part(v_email, '@', 2), '');
  if v_domain is null then
    return false;
  end if;

  if exists (
    select 1
    from public.protected_access_rules r
    where r.match_type = 'domain'
      and r.match_value = v_domain
  ) then
    return true;
  end if;

  return false;
end;
$$;

revoke all on function public.is_protected_user(uuid, text) from public, anon, authenticated;
grant execute on function public.is_protected_user(uuid, text) to service_role;


-- Apply protection: force allowlist + DB fallback to Pro with a far-future expiry.
create or replace function public.apply_protection_for_user(p_user_id uuid, p_note text default 'protected_rule')
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_expires timestamptz := '2099-12-31T00:00:00Z'::timestamptz;
begin
  if not public.is_protected_user(p_user_id, null) then
    return;
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = p_user_id;

  -- beta_access: highest-priority override in the app.
  begin
    insert into public.beta_access (user_id, email, tier, expires_at, note, created_at, updated_at)
    values (p_user_id, v_email, 'pro', v_expires, p_note, now(), now())
    on conflict (user_id)
    do update set
      email = excluded.email,
      tier = 'pro',
      expires_at = greatest(coalesce(beta_access.expires_at, excluded.expires_at), excluded.expires_at),
      note = excluded.note,
      updated_at = now();
  exception when undefined_table or undefined_column then
    null;
  end;

  -- user_subscriptions: DB fallback used when RevenueCat isn't available.
  begin
    -- NOTE: some environments enforce a platform CHECK constraint (e.g. ios/android/web).
    -- Avoid writing a non-standard value (like 'server') and keep this best-effort.
    insert into public.user_subscriptions (user_id, tier, source, expires_at, updated_at)
    values (p_user_id, 'pro', 'beta', v_expires, now())
    on conflict (user_id)
    do update set
      tier = 'pro',
      source = excluded.source,
      expires_at = greatest(coalesce(user_subscriptions.expires_at, excluded.expires_at), excluded.expires_at),
      updated_at = now();
  exception when others then
    null;
  end;

  -- user_profiles: admin UI uses this in a few places (best-effort).
  begin
    update public.user_profiles
    set tier = 'pro'
    where user_id = p_user_id;
  exception when undefined_table or undefined_column then
    null;
  end;
end;
$$;

revoke all on function public.apply_protection_for_user(uuid, text) from public, anon, authenticated;
grant execute on function public.apply_protection_for_user(uuid, text) to service_role;


-- Trigger: apply protection automatically on signup (auth.users insert).
create or replace function public.protected_access_on_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.is_protected_user(new.id, new.email) then
    perform public.apply_protection_for_user(new.id, 'protected_on_signup');
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_protected_access_on_auth_user_insert'
  ) then
    create trigger trg_protected_access_on_auth_user_insert
    after insert on auth.users
    for each row execute function public.protected_access_on_auth_user_insert();
  end if;
end $$;


-- Default rules (safe for production; restrict to internal/test domains + explicit addresses).
insert into public.protected_access_rules (match_type, match_value, tier, note)
values
  ('domain', 'vespa.academy', 'pro', 'test_domain'),
  ('domain', 'fl4sh.cards', 'pro', 'internal_domain'),
  ('domain', 'fl4shcards.com', 'pro', 'internal_domain'),
  ('email', 'admin@4sighteducation.com', 'pro', 'internal_test'),
  ('email', 'tony@fl4shcards.com', 'pro', 'internal_test')
on conflict (match_type, match_value) do nothing;


-- Backfill: apply protection to any existing auth users matching rules.
do $$
begin
  begin
    perform public.apply_protection_for_user(u.id, 'protected_backfill')
    from auth.users u
    where public.is_protected_user(u.id, u.email) = true;
  exception when others then
    -- Don't block migrations if auth/users isn't accessible in some environments.
    null;
  end;
end $$;


-- Patch trial expiry functions: never wipe/downgrade protected users.
create or replace function public.process_expired_trial_user(p_user_id uuid, p_force boolean default false)
returns table (ok boolean, reason text)
language plpgsql
security definer
as $$
declare
  v_role text;
  v_now timestamptz := now();
  v_sub record;
  v_has_beta boolean := false;
  v_has_recent_post_expiry_invite boolean := false;
begin
  v_role := coalesce(auth.jwt()->>'role', '');
  if v_role <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  -- Protected accounts are never wiped/downgraded.
  if public.is_protected_user(p_user_id, null) then
    return query select false, 'protected_user';
    return;
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

  -- Grace window: if an invite was sent AFTER expiry and within the last 7 days, skip wipes.
  begin
    select true into v_has_recent_post_expiry_invite
    from public.parent_invites pi
    where pi.user_id = p_user_id
      and v_sub.expires_at is not null
      and pi.created_at >= v_sub.expires_at
      and pi.created_at >= v_now - interval '7 days'
      and pi.status in ('pending', 'sending', 'sent')
    limit 1;
  exception when undefined_table then
    v_has_recent_post_expiry_invite := false;
  end;

  if v_has_recent_post_expiry_invite and not p_force then
    return query select false, 'pending_post_expiry_invite';
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

alter function public.process_expired_trial_user(uuid, boolean) set search_path = public;
revoke all on function public.process_expired_trial_user(uuid, boolean) from public, anon, authenticated;
grant execute on function public.process_expired_trial_user(uuid, boolean) to service_role;


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
    and not public.is_protected_user(us.user_id, null)
    and exists (
      select 1
      from public.parent_invites pi
      where pi.user_id = us.user_id
        and pi.created_at >= us.expires_at
        and pi.status in ('pending', 'sending', 'sent')
    )
    and not exists (
      select 1
      from public.parent_invites pi
      where pi.user_id = us.user_id
        and pi.created_at >= us.expires_at
        and pi.created_at >= now() - interval '7 days'
        and pi.status in ('pending', 'sending', 'sent')
    )
  limit p_limit;
$$;

revoke all on function public.get_expired_trial_users(integer) from anon, authenticated;
grant execute on function public.get_expired_trial_users(integer) to service_role;

