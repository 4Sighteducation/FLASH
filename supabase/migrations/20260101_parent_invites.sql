-- Track "invite parent/guardian" requests from Free plan users (rate limiting + auditing)
-- Safe to run multiple times.

create table if not exists public.parent_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  child_email text not null,
  parent_email text not null,
  parent_email_lower text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  sent_at timestamptz null,
  error text null
);

create index if not exists parent_invites_user_created_idx
  on public.parent_invites (user_id, created_at desc);

create index if not exists parent_invites_parent_lower_idx
  on public.parent_invites (parent_email_lower);

drop trigger if exists trg_parent_invites_updated_at on public.parent_invites;
create trigger trg_parent_invites_updated_at
before update on public.parent_invites
for each row execute function public.set_updated_at();

alter table public.parent_invites enable row level security;

drop policy if exists "parent_invites_select_own" on public.parent_invites;
create policy "parent_invites_select_own"
on public.parent_invites
for select
using (auth.uid() = user_id);

