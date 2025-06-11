-- Create app_settings table for storing API keys and other settings
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, setting_key)
);

-- Create index for faster lookups
CREATE INDEX idx_app_settings_user_id ON app_settings(user_id);

-- Create RLS policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own settings
CREATE POLICY "Users can view own settings" ON app_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert own settings" ON app_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings" ON app_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own settings
CREATE POLICY "Users can delete own settings" ON app_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to upsert settings
CREATE OR REPLACE FUNCTION upsert_app_setting(
    p_setting_key TEXT,
    p_setting_value TEXT
)
RETURNS app_settings AS $$
DECLARE
    v_result app_settings;
BEGIN
    INSERT INTO app_settings (user_id, setting_key, setting_value, updated_at)
    VALUES (auth.uid(), p_setting_key, p_setting_value, NOW())
    ON CONFLICT (user_id, setting_key)
    DO UPDATE SET 
        setting_value = EXCLUDED.setting_value,
        updated_at = NOW()
    RETURNING * INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION upsert_app_setting TO authenticated; 