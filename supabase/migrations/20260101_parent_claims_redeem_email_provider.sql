-- Store provider metadata for redeem emails (helps debug SendGrid deliverability)

alter table public.parent_claims
  add column if not exists redeem_email_provider text null,
  add column if not exists redeem_email_provider_message_id text null,
  add column if not exists redeem_email_provider_status integer null;

