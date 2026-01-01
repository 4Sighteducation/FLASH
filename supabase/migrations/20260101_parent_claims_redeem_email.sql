-- Track redeem email delivery for parent claims (so webhooks can retry safely without silent failure)

alter table public.parent_claims
  add column if not exists redeem_email_sent_at timestamptz null,
  add column if not exists redeem_email_attempts integer not null default 0,
  add column if not exists redeem_email_last_error text null;

create index if not exists parent_claims_redeem_email_sent_at_idx on public.parent_claims (redeem_email_sent_at);

