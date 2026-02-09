-- Refine "ask someone else to pay" grace logic:
-- - Grace should only apply when an invite is sent AFTER the trial expiry timestamp.
-- - Allow a forced wipe when the user explicitly chooses "Move to Free".
--
-- This updates:
-- - public.process_expired_trial_user(p_user_id uuid, p_force boolean default false)
-- - public.get_expired_trial_users(p_limit integer default 500)
--
-- NOTE: Environments may have older definitions from 20260115_pro_trial_v1.sql and 20260122_parent_invite_grace.sql.

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
  -- This prevents "sending during trial" from unintentionally extending grace.
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

-- Auto-wipe targets: ONLY users who asked someone else to pay after expiry AND their 7-day grace has ended.
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

