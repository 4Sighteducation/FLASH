-- Track who you gave a code to (manual assignment), and allow cancelling codes without losing redemption history.
-- This supports the marketing admin "Codes" page UX.

alter table public.access_codes
  add column if not exists assigned_to text,
  add column if not exists assigned_note text,
  add column if not exists assigned_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_note text;

create index if not exists access_codes_assigned_to_idx
  on public.access_codes (lower(assigned_to));

create index if not exists access_codes_cancelled_at_idx
  on public.access_codes (cancelled_at);

