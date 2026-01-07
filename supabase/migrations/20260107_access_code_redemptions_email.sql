-- Store the redeemer email for audit/admin UX without having to query auth.users.

alter table public.access_code_redemptions
  add column if not exists user_email text null;

create index if not exists access_code_redemptions_user_email_idx
  on public.access_code_redemptions (lower(user_email));

-- Update redeem function to record user_email (best-effort).
create or replace function public.redeem_access_code(p_code text, p_user_id uuid)
returns table (code_id uuid, tier text, expires_at timestamptz, note text) as $$
declare
  v_code text;
  v_rec record;
  v_email text;
begin
  if p_user_id is null then
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
    where r.code_id = v_rec.id and r.user_id = p_user_id
  ) then
    return query select v_rec.id, v_rec.tier, v_rec.expires_at, v_rec.note;
    return;
  end if;

  if v_rec.uses_count >= v_rec.max_uses then
    raise exception 'Code has been used';
  end if;

  -- Best-effort: attach email for admin visibility
  begin
    select email into v_email from auth.users where id = p_user_id;
  exception when others then
    v_email := null;
  end;

  insert into public.access_code_redemptions (code_id, user_id, user_email)
  values (v_rec.id, p_user_id, v_email);

  update public.access_codes
  set uses_count = uses_count + 1
  where id = v_rec.id;

  return query select v_rec.id, v_rec.tier, v_rec.expires_at, v_rec.note;
end;
$$ language plpgsql security definer;

alter function public.redeem_access_code(text, uuid) set search_path = public;

