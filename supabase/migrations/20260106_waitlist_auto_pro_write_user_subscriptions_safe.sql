-- Ensure waitlist auto-Pro works with current app builds that read public.user_subscriptions.
-- IMPORTANT: this code must NEVER block auth signups, so user_subscriptions writes are best-effort.

create or replace function public.grant_pro_to_user(p_user_id uuid, p_expires_at timestamptz, p_source text, p_note text)
returns void as $$
begin
  -- Best-effort upsert into public.user_subscriptions (schema can drift; never block).
  begin
    insert into public.user_subscriptions (user_id, tier, source, platform, expires_at, created_at, updated_at)
    values (p_user_id, 'pro', p_source, 'web', p_expires_at, now(), now())
    on conflict (user_id)
    do update set tier = excluded.tier,
                  source = excluded.source,
                  platform = excluded.platform,
                  expires_at = excluded.expires_at,
                  updated_at = now();
  exception when others then
    -- swallow (table/columns/constraints may differ in some environments)
    null;
  end;

  -- Source of truth for free access is public.beta_access (read by the app as an override in newer builds).
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

