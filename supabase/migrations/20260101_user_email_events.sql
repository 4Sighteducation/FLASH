-- Track transactional emails we send to users (idempotency + auditing)
-- Safe to run multiple times.

create table if not exists public.user_email_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  type text not null check (type in ('welcome')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  sent_at timestamptz null,
  error text null
);

create unique index if not exists user_email_events_user_type_idx
  on public.user_email_events (user_id, type);

drop trigger if exists trg_user_email_events_updated_at on public.user_email_events;
create trigger trg_user_email_events_updated_at
before update on public.user_email_events
for each row execute function public.set_updated_at();

-- Lock down by default (Edge Function uses service role)
alter table public.user_email_events enable row level security;

drop policy if exists "user_email_events_select_own" on public.user_email_events;
create policy "user_email_events_select_own"
on public.user_email_events
for select
using (auth.uid() = user_id);

