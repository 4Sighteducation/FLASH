-- Fix: allow deleting auth.users even if a waitlist row references them via auto_pro_granted_user_id.
-- Without an ON DELETE action, Supabase/Auth deletion fails with "Database error deleting user".

do $$
begin
  -- Drop existing FK if present
  if exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_auto_pro_granted_user_id_fkey'
      and conrelid = 'public.waitlist'::regclass
  ) then
    alter table public.waitlist
      drop constraint waitlist_auto_pro_granted_user_id_fkey;
  end if;

  -- Recreate with ON DELETE SET NULL to avoid blocking account deletion.
  alter table public.waitlist
    add constraint waitlist_auto_pro_granted_user_id_fkey
    foreign key (auto_pro_granted_user_id)
    references auth.users(id)
    on delete set null;
end $$;

