-- Add metadata columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS exam_type TEXT,
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- Create user_subjects table to store subject selections with exam boards
CREATE TABLE IF NOT EXISTS public.user_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL, -- References exam_board_subjects
  exam_board TEXT NOT NULL,
  color TEXT, -- Hex color for the subject
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, subject_id)
);

-- Create user_custom_topics table for user's customized topic lists
CREATE TABLE IF NOT EXISTS public.user_custom_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL, -- References exam_board_subjects
  parent_topic_id UUID, -- NULL for top-level topics, references parent for subtopics
  original_topic_id UUID, -- References curriculum_topics if based on existing topic
  title TEXT NOT NULL,
  color TEXT, -- Hex color, inherits from subject if not specified
  is_custom BOOLEAN DEFAULT FALSE, -- TRUE if user created, FALSE if from curriculum
  is_deleted BOOLEAN DEFAULT FALSE, -- Soft delete for curriculum topics
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable RLS on new tables
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_topics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_subjects
CREATE POLICY "Users can view own subjects" ON public.user_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON public.user_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON public.user_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON public.user_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user_custom_topics
CREATE POLICY "Users can view own custom topics" ON public.user_custom_topics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom topics" ON public.user_custom_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom topics" ON public.user_custom_topics
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom topics" ON public.user_custom_topics
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_id ON public.user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_topics_user_id ON public.user_custom_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_topics_subject_id ON public.user_custom_topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_topics_parent_id ON public.user_custom_topics(parent_topic_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_subjects_updated_at BEFORE UPDATE ON public.user_subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_custom_topics_updated_at BEFORE UPDATE ON public.user_custom_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 