-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create a new insert policy that allows users to create their profile during signup
CREATE POLICY "Users can insert own profile on signup" ON public.users
  FOR INSERT 
  WITH CHECK (
    auth.uid() = id
  );

-- Also create a service role policy for the initial insert
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Alternative: Make the insert policy more permissive during signup
-- This allows the auth trigger or our app to create the user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now(),
    now()
  );
  
  -- Also create initial user stats
  INSERT INTO public.user_stats (user_id, created_at, updated_at)
  VALUES (new.id, now(), now());
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 