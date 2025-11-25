-- Create waitlist table for marketing site
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL,
  is_top_twenty BOOLEAN DEFAULT false,
  source TEXT DEFAULT 'launch_banner',
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Create index on position
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.waitlist(position);

-- Create index on is_top_twenty for filtering
CREATE INDEX IF NOT EXISTS idx_waitlist_top_twenty ON public.waitlist(is_top_twenty);

-- Enable Row Level Security
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waitlist' 
    AND policyname = 'Anyone can join waitlist'
  ) THEN
    CREATE POLICY "Anyone can join waitlist"
      ON public.waitlist
      FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waitlist' 
    AND policyname = 'Service role can select all'
  ) THEN
    CREATE POLICY "Service role can select all"
      ON public.waitlist
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waitlist' 
    AND policyname = 'Service role can update'
  ) THEN
    CREATE POLICY "Service role can update"
      ON public.waitlist
      FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.waitlist IS 'Stores email signups for early access launch campaign';

