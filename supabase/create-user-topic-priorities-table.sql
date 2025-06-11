-- Create user_topic_priorities table
CREATE TABLE IF NOT EXISTS user_topic_priorities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 1 AND priority <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Ensure one priority per user-topic combination
  UNIQUE(user_id, topic_id)
);

-- Create indexes
CREATE INDEX idx_user_topic_priorities_user_id ON user_topic_priorities(user_id);
CREATE INDEX idx_user_topic_priorities_topic_id ON user_topic_priorities(topic_id);

-- Enable RLS
ALTER TABLE user_topic_priorities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own topic priorities"
  ON user_topic_priorities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topic priorities"
  ON user_topic_priorities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own topic priorities"
  ON user_topic_priorities FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own topic priorities"
  ON user_topic_priorities FOR DELETE
  USING (auth.uid() = user_id);

-- Create update trigger
CREATE TRIGGER update_user_topic_priorities_updated_at
  BEFORE UPDATE ON user_topic_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 