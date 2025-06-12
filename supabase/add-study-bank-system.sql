-- Add study bank functionality to flashcards system
-- This migration adds the ability to separate Card Bank from Study Bank

-- Add column to flashcards table to track if card is in study mode
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS in_study_bank BOOLEAN DEFAULT FALSE;

-- Add column to track when card was added to study bank
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS added_to_study_bank_at TIMESTAMP WITH TIME ZONE;

-- Create table to track topic-level study preferences
CREATE TABLE IF NOT EXISTS public.topic_study_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  in_study_bank BOOLEAN DEFAULT FALSE,
  priority_level INTEGER DEFAULT 3 CHECK (priority_level >= 1 AND priority_level <= 5), -- 1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, topic_id)
);

-- Create table for daily study tracking
CREATE TABLE IF NOT EXISTS public.daily_study_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  study_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, flashcard_id, study_date)
);

-- Add RLS policies for new tables
ALTER TABLE public.topic_study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study_cards ENABLE ROW LEVEL SECURITY;

-- Topic study preferences policies
CREATE POLICY "Users can view own topic preferences" ON public.topic_study_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own topic preferences" ON public.topic_study_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own topic preferences" ON public.topic_study_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own topic preferences" ON public.topic_study_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Daily study cards policies
CREATE POLICY "Users can view own daily cards" ON public.daily_study_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily cards" ON public.daily_study_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily cards" ON public.daily_study_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flashcards_study_bank ON public.flashcards(user_id, in_study_bank);
CREATE INDEX IF NOT EXISTS idx_topic_study_preferences_user ON public.topic_study_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_study_cards_user_date ON public.daily_study_cards(user_id, study_date);

-- Create trigger for topic_study_preferences updated_at
CREATE TRIGGER update_topic_study_preferences_updated_at BEFORE UPDATE ON public.topic_study_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to sync flashcards with topic study preferences
CREATE OR REPLACE FUNCTION sync_flashcards_with_topic_preferences()
RETURNS TRIGGER AS $$
BEGIN
  -- When a topic preference is updated, update all flashcards for that topic
  IF NEW.in_study_bank != OLD.in_study_bank THEN
    UPDATE public.flashcards
    SET 
      in_study_bank = NEW.in_study_bank,
      added_to_study_bank_at = CASE 
        WHEN NEW.in_study_bank = TRUE THEN TIMEZONE('utc', NOW())
        ELSE NULL
      END
    WHERE user_id = NEW.user_id 
      AND topic_id = NEW.topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync flashcards when topic preferences change
CREATE TRIGGER sync_flashcards_on_topic_preference_change
AFTER UPDATE ON public.topic_study_preferences
FOR EACH ROW
EXECUTE FUNCTION sync_flashcards_with_topic_preferences();

-- Function to populate daily study cards
CREATE OR REPLACE FUNCTION populate_daily_study_cards(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert cards that are due for review today and in study bank
  INSERT INTO public.daily_study_cards (user_id, flashcard_id, study_date)
  SELECT 
    p_user_id,
    id,
    CURRENT_DATE
  FROM public.flashcards
  WHERE user_id = p_user_id
    AND in_study_bank = TRUE
    AND next_review_date::date <= CURRENT_DATE
  ON CONFLICT (user_id, flashcard_id, study_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Add subject_name and topic_name to flashcards for easier querying
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS subject_name TEXT,
ADD COLUMN IF NOT EXISTS topic_name TEXT; 