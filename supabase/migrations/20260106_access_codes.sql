-- Redeemable access codes for free Premium/Pro (no email needed; works with Sign in with Apple private relay)

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text not null default 'pro' check (tier in ('premium', 'pro')),
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses >= 1),
  uses_count integer not null default 0 check (uses_count >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists access_codes_expires_at_idx on public.access_codes (expires_at);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(code_id, user_id)
);

create index if not exists access_code_redemptions_user_id_idx on public.access_code_redemptions (user_id);

alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;

-- Service role only for managing codes/redemptions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='access_codes' and policyname='Service role can manage access codes'
  ) then
    create policy "Service role can manage access codes"
      on public.access_codes
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='access_code_redemptions' and policyname='Service role can manage code redemptions'
  ) then
    create policy "Service role can manage code redemptions"
      on public.access_code_redemptions
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- updated_at helper (reuses existing function if present)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists access_codes_set_updated_at on public.access_codes;
create trigger access_codes_set_updated_at
before update on public.access_codes
for each row execute function public.set_updated_at();

-- Redeemable access codes for free Premium/Pro (no email needed; works with Sign in with Apple private relay)

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  tier text not null default 'pro' check (tier in ('premium', 'pro')),
  expires_at timestamptz,
  max_uses integer not null default 1 check (max_uses >= 1),
  uses_count integer not null default 0 check (uses_count >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists access_codes_expires_at_idx on public.access_codes (expires_at);

create table if not exists public.access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique(code_id, user_id)
);

create index if not exists access_code_redemptions_user_id_idx on public.access_code_redemptions (user_id);

alter table public.access_codes enable row level security;
alter table public.access_code_redemptions enable row level security;

-- Service role only for managing codes/redemptions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='access_codes' and policyname='Service role can manage access codes'
  ) then
    create policy "Service role can manage access codes"
      on public.access_codes
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='access_code_redemptions' and policyname='Service role can manage code redemptions'
  ) then
    create policy "Service role can manage code redemptions"
      on public.access_code_redemptions
      for all
      using (auth.jwt()->>'role' = 'service_role');
  end if;
end $$;

-- updated_at helper (reuses existing function if present)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists access_codes_set_updated_at on public.access_codes;
create trigger access_codes_set_updated_at
before update on public.access_codes
for each row execute function public.set_updated_at();

-- Atomic redeem (handles max_uses + one redemption per user).
-- This is SECURITY DEFINER so it can be called from Edge Functions safely.
create or replace function public.redeem_access_code(p_code text, p_user_id uuid)
returns table (code_id uuid, tier text, expires_at timestamptz, note text) as $$
declare
  v_code text;
  v_rec record;
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

  insert into public.access_code_redemptions (code_id, user_id)
  values (v_rec.id, p_user_id);

  update public.access_codes
  set uses_count = uses_count + 1
  where id = v_rec.id;

  return query select v_rec.id, v_rec.tier, v_rec.expires_at, v_rec.note;
end;
$$ language plpgsql security definer;

alter function public.redeem_access_code(text, uuid) set search_path = public;

