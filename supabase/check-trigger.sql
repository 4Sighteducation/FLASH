-- Check if the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'auth' 
AND trigger_name = 'on_auth_user_created';

-- Check if there are any users in auth.users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if there are any users in public.users
SELECT * FROM public.users;

-- If you need to manually create a user profile for existing auth users:
-- INSERT INTO public.users (id, email, username, created_at, updated_at)
-- SELECT 
--     id, 
--     email, 
--     COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)),
--     created_at,
--     created_at
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.users); 