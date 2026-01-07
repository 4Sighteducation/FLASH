-- Store payer/parent email as a failsafe delivery channel for the claim code.
-- This helps when the child email is an Apple private relay that delays/blocks forwarding.

alter table public.parent_claims
  add column if not exists payer_email text null,
  add column if not exists payer_email_lower text null,
  add column if not exists payer_redeem_email_sent_at timestamptz null,
  add column if not exists payer_redeem_email_attempts integer not null default 0,
  add column if not exists payer_redeem_email_last_error text null,
  add column if not exists payer_redeem_email_provider text null,
  add column if not exists payer_redeem_email_provider_message_id text null,
  add column if not exists payer_redeem_email_provider_status integer null;

create index if not exists parent_claims_payer_email_lower_idx on public.parent_claims (payer_email_lower);
create index if not exists parent_claims_payer_redeem_email_sent_at_idx on public.parent_claims (payer_redeem_email_sent_at);

