-- Phase 1 security hardening (Critical/High)
-- - Lock down SECURITY DEFINER functions (revoke PUBLIC execute)
-- - Add explicit caller checks where functions accept user_id inputs
-- Safe to run multiple times.

-- 1) Harden ensure_user_profile:
--    - authenticated callers can only create their own row
--    - do not trust caller-supplied email (derive from auth.users)
create or replace function public.ensure_user_profile(
  p_user_id uuid,
  p_email text,
  p_username text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_email text;
begin
  v_role := coalesce(auth.jwt()->>'role', '');

  -- Non-service-role callers may only operate on themselves
  if v_role <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Not authenticated';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'Forbidden';
    end if;
  end if;

  -- Prefer canonical email from auth.users
  begin
    select email into v_email from auth.users where id = p_user_id;
  exception when others then
    v_email := null;
  end;
  v_email := coalesce(nullif(v_email, ''), nullif(p_email, ''));

  -- Create users row if missing
  insert into public.users (id, email, username, is_onboarded, created_at, updated_at)
  values (
    p_user_id,
    v_email,
    coalesce(nullif(p_username, ''), split_part(coalesce(v_email, ''), '@', 1)),
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- Create user_stats row if missing
  insert into public.user_stats (user_id, created_at, updated_at)
  values (p_user_id, now(), now())
  on conflict (user_id) do nothing;
end;
$$;

alter function public.ensure_user_profile(uuid, text, text) set search_path = public;
revoke all on function public.ensure_user_profile(uuid, text, text) from public, anon;
grant execute on function public.ensure_user_profile(uuid, text, text) to authenticated;
grant execute on function public.ensure_user_profile(uuid, text, text) to service_role;


-- 2) Harden redeem_access_code:
--    - authenticated callers may only redeem for themselves
--    - service_role can redeem for a specified user_id (used by edge functions)
create or replace function public.redeem_access_code(p_code text, p_user_id uuid)
returns table (code_id uuid, tier text, expires_at timestamptz, note text) as $$
declare
  v_role text;
  v_user_id uuid;
  v_code text;
  v_rec record;
  v_email text;
begin
  v_role := coalesce(auth.jwt()->>'role', '');

  if v_role = 'service_role' then
    v_user_id := p_user_id;
  else
    if auth.uid() is null then
      raise exception 'Not authenticated';
    end if;
    v_user_id := auth.uid();
    if p_user_id is not null and p_user_id <> v_user_id then
      raise exception 'Forbidden';
    end if;
  end if;

  if v_user_id is null then
    raise exception 'Missing user';
  end if;

  v_code := regexp_replace(upper(coalesce(p_code, '')), '[^0-9A-Z]', '', 'g');
  if length(v_code) < 8 then
    raise exception 'Invalid code';
  end if;

  select * into v_rec
  from public.access_codes
  where code = v_code
  for update;

  if v_rec.id is null then
    return;
  end if;

  if v_rec.expires_at is not null and v_rec.expires_at < now() then
    raise exception 'Code expired';
  end if;

  -- Already redeemed by this user? Return success without consuming another use.
  if exists (
    select 1 from public.access_code_redemptions r
    where r.code_id = v_rec.id and r.user_id = v_user_id
  ) then
    return query select v_rec.id, v_rec.tier, v_rec.expires_at, v_rec.note;
    return;
  end if;

  if v_rec.uses_count >= v_rec.max_uses then
    raise exception 'Code has been used';
  end if;

  -- Best-effort: attach email for admin visibility
  begin
    select email into v_email from auth.users where id = v_user_id;
  exception when others then
    v_email := null;
  end;

  insert into public.access_code_redemptions (code_id, user_id, user_email)
  values (v_rec.id, v_user_id, v_email);

  update public.access_codes
  set uses_count = uses_count + 1
  where id = v_rec.id;

  return query select v_rec.id, v_rec.tier, v_rec.expires_at, v_rec.note;
end;
$$ language plpgsql security definer;

alter function public.redeem_access_code(text, uuid) set search_path = public;
revoke all on function public.redeem_access_code(text, uuid) from public, anon;
grant execute on function public.redeem_access_code(text, uuid) to authenticated;
grant execute on function public.redeem_access_code(text, uuid) to service_role;


-- 3) Remove direct execute access to Pro-grant helpers (should run only via internal trigger paths / service role tooling)
revoke all on function public.grant_pro_to_user(uuid, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.grant_pro_to_user(uuid, timestamptz, text, text) to service_role;

revoke all on function public.waitlist_auto_pro_on_auth_user_insert() from public, anon, authenticated;

