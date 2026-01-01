-- ============================================
-- ADD TUTORIAL TRACKING TO USERS TABLE
-- ============================================

-- Add column to track if user has seen Reveal Context tutorial
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS has_seen_reveal_context_tutorial BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_tutorial_status 
ON users(has_seen_reveal_context_tutorial) 
WHERE has_seen_reveal_context_tutorial = FALSE;

-- Verify column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'has_seen_reveal_context_tutorial';


