-- Ensures a row exists in public.users (and public.user_stats) for an auth user.
-- This prevents onboarding flows from failing if the auth->profile trigger isn't installed.

create or replace function public.ensure_user_profile(
  p_user_id uuid,
  p_email text,
  p_username text default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Create users row if missing
  insert into public.users (id, email, username, created_at, updated_at)
  values (
    p_user_id,
    p_email,
    coalesce(nullif(p_username, ''), split_part(p_email, '@', 1)),
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- Create user_stats row if missing
  insert into public.user_stats (user_id, created_at, updated_at)
  values (p_user_id, now(), now())
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_user_profile(uuid, text, text) from anon;
grant execute on function public.ensure_user_profile(uuid, text, text) to authenticated;
grant execute on function public.ensure_user_profile(uuid, text, text) to service_role;


