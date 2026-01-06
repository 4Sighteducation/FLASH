-- Store generated early access codes against waitlist entries (top 20)
-- Note: emails may be private relay; codes allow redemption regardless of email used in-app.

alter table public.waitlist
  add column if not exists early_access_code text,
  add column if not exists early_access_code_created_at timestamptz,
  add column if not exists early_access_code_sent_at timestamptz;

create index if not exists idx_waitlist_early_access_code on public.waitlist (early_access_code);

