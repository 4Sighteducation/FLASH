-- Allows a device to "claim" an Expo push token when a user switches accounts.
-- This prevents RLS failures on upsert when the same token exists for a different user.

create or replace function public.claim_user_push_token(p_expo_push_token text, p_platform text default null)
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- If token exists for another user, reassign it to the current user.
  update public.user_push_tokens
  set
    user_id = auth.uid(),
    enabled = true,
    platform = coalesce(p_platform, platform),
    last_seen_at = now()
  where expo_push_token = p_expo_push_token;

  -- If no row existed, insert one for current user.
  insert into public.user_push_tokens (user_id, expo_push_token, platform, enabled, created_at, updated_at, last_seen_at)
  values (auth.uid(), p_expo_push_token, p_platform, true, now(), now(), now())
  on conflict (expo_push_token) do update
    set user_id = excluded.user_id,
        enabled = true,
        platform = coalesce(excluded.platform, public.user_push_tokens.platform),
        last_seen_at = now();
end;
$$;

revoke all on function public.claim_user_push_token(text, text) from anon;
grant execute on function public.claim_user_push_token(text, text) to authenticated;
grant execute on function public.claim_user_push_token(text, text) to service_role;





