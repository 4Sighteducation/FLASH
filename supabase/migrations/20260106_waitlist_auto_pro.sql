-- Auto-grant 1-year Pro for selected waitlist users when they create an account.
-- This avoids redeem codes entirely (email can just contain download links + instructions).
--
-- IMPORTANT: This only works if the user signs up with the SAME email as the waitlist entry.
-- If they use Sign in with Apple + "Hide my email", their auth email becomes a relay and won't match.

alter table public.waitlist
  add column if not exists auto_pro_enabled boolean not null default false,
  add column if not exists auto_pro_days integer not null default 365,
  add column if not exists auto_pro_granted_at timestamptz,
  add column if not exists auto_pro_granted_user_id uuid references auth.users(id);

create index if not exists idx_waitlist_auto_pro_enabled on public.waitlist (auto_pro_enabled);
create index if not exists idx_waitlist_auto_pro_granted_user_id on public.waitlist (auto_pro_granted_user_id);

-- Grant helper (idempotent)
create or replace function public.grant_pro_to_user(p_user_id uuid, p_expires_at timestamptz, p_source text, p_note text)
returns void as $$
begin
  -- IMPORTANT:
  -- Do NOT write to public.user_subscriptions here. That table has drifted across builds/environments
  -- (legacy 'lite/full' vs newer 'premium/pro', differing columns), and any mismatch will BREAK SIGNUPS
  -- because this function is called from an auth.users trigger.
  --
  -- Source of truth for free access is public.beta_access (read by the app as an override).
  insert into public.beta_access (user_id, email, tier, expires_at, note, created_at, updated_at)
  values (
    p_user_id,
    (select email from auth.users where id = p_user_id),
    'pro',
    p_expires_at,
    p_note,
    now(),
    now()
  )
  on conflict (user_id)
  do update set email = excluded.email,
                tier = excluded.tier,
                expires_at = excluded.expires_at,
                note = excluded.note,
                updated_at = now();
end;
$$ language plpgsql security definer;

alter function public.grant_pro_to_user(uuid, timestamptz, text, text) set search_path = public;

-- Trigger: when an auth user is created, check waitlist and grant Pro if eligible
create or replace function public.waitlist_auto_pro_on_auth_user_insert()
returns trigger as $$
declare
  wl record;
  days_to_grant integer;
  exp timestamptz;
begin
  if new.email is null then
    return new;
  end if;

  select *
  into wl
  from public.waitlist
  where lower(email) = lower(new.email)
    and (is_top_twenty = true or auto_pro_enabled = true)
  order by created_at asc
  limit 1;

  if wl.id is null then
    return new;
  end if;

  if wl.auto_pro_granted_at is not null then
    return new;
  end if;

  days_to_grant := greatest(coalesce(wl.auto_pro_days, 365), 1);
  exp := now() + make_interval(days => days_to_grant);

  -- Never block signup if anything goes wrong while granting.
  begin
    perform public.grant_pro_to_user(new.id, exp, 'waitlist_auto', 'waitlist_auto');
  exception when others then
    -- swallow to avoid "Database error saving new user"
    return new;
  end;

  update public.waitlist
  set auto_pro_granted_at = now(),
      auto_pro_granted_user_id = new.id
  where id = wl.id;

  return new;
end;
$$ language plpgsql security definer;

alter function public.waitlist_auto_pro_on_auth_user_insert() set search_path = public;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_waitlist_auto_pro_on_auth_user_insert'
  ) then
    create trigger trg_waitlist_auto_pro_on_auth_user_insert
    after insert on auth.users
    for each row execute function public.waitlist_auto_pro_on_auth_user_insert();
  end if;
end $$;

