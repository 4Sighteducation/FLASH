-- Create user_subscriptions table for managing lite vs full versions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier text NOT NULL CHECK (tier IN ('lite', 'full')),
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  purchase_token text,
  purchased_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions" ON user_subscriptions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Function to check if user has exceeded limits
CREATE OR REPLACE FUNCTION check_user_limits(
  p_user_id uuid,
  p_limit_type text,
  p_current_count integer
) RETURNS boolean AS $$
DECLARE
  v_tier text;
  v_max_allowed integer;
BEGIN
  -- Get user's subscription tier
  SELECT tier INTO v_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Default to lite if no subscription found
  IF v_tier IS NULL THEN
    v_tier := 'lite';
  END IF;
  
  -- Set limits based on tier and type
  IF v_tier = 'lite' THEN
    CASE p_limit_type
      WHEN 'subject' THEN v_max_allowed := 1;
      WHEN 'topic' THEN v_max_allowed := 1;
      WHEN 'card' THEN v_max_allowed := 10;
      ELSE v_max_allowed := 0;
    END CASE;
  ELSE -- full tier
    v_max_allowed := -1; -- unlimited
  END IF;
  
  -- Return whether user can add more
  RETURN v_max_allowed = -1 OR p_current_count < v_max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 