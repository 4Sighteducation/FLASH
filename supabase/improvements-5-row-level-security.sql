-- Step 5: Enable Row Level Security and Create Policies
-- This ensures users can only access their own data

-- 1. Enable RLS on all tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_board_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Create policies for public/reference data (anyone can read)
DROP POLICY IF EXISTS "Anyone can view exam boards" ON public.exam_boards;
CREATE POLICY "Anyone can view exam boards" ON public.exam_boards
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view qualification types" ON public.qualification_types;
CREATE POLICY "Anyone can view qualification types" ON public.qualification_types
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view exam board subjects" ON public.exam_board_subjects;
CREATE POLICY "Anyone can view exam board subjects" ON public.exam_board_subjects
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view curriculum topics" ON public.curriculum_topics;
CREATE POLICY "Anyone can view curriculum topics" ON public.curriculum_topics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- 3. Create policies for user-specific data

-- Users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User topics
DROP POLICY IF EXISTS "Users can view own topics" ON public.user_topics;
CREATE POLICY "Users can view own topics" ON public.user_topics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own topics" ON public.user_topics;
CREATE POLICY "Users can insert own topics" ON public.user_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own topics" ON public.user_topics;
CREATE POLICY "Users can delete own topics" ON public.user_topics
  FOR DELETE USING (auth.uid() = user_id);

-- User custom topics
DROP POLICY IF EXISTS "Users can view own custom topics" ON public.user_custom_topics;
CREATE POLICY "Users can view own custom topics" ON public.user_custom_topics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own custom topics" ON public.user_custom_topics;
CREATE POLICY "Users can insert own custom topics" ON public.user_custom_topics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own custom topics" ON public.user_custom_topics;
CREATE POLICY "Users can update own custom topics" ON public.user_custom_topics
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom topics" ON public.user_custom_topics;
CREATE POLICY "Users can delete own custom topics" ON public.user_custom_topics
  FOR DELETE USING (auth.uid() = user_id);

-- User subjects
DROP POLICY IF EXISTS "Users can view own subjects" ON public.user_subjects;
CREATE POLICY "Users can view own subjects" ON public.user_subjects
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subjects" ON public.user_subjects;
CREATE POLICY "Users can insert own subjects" ON public.user_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subjects" ON public.user_subjects;
CREATE POLICY "Users can update own subjects" ON public.user_subjects
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subjects" ON public.user_subjects;
CREATE POLICY "Users can delete own subjects" ON public.user_subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Flashcards
DROP POLICY IF EXISTS "Users can view own flashcards" ON public.flashcards;
CREATE POLICY "Users can view own flashcards" ON public.flashcards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own flashcards" ON public.flashcards;
CREATE POLICY "Users can insert own flashcards" ON public.flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcards" ON public.flashcards;
CREATE POLICY "Users can update own flashcards" ON public.flashcards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete own flashcards" ON public.flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- Study sessions
DROP POLICY IF EXISTS "Users can view own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view own study sessions" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study sessions" ON public.study_sessions;
CREATE POLICY "Users can update own study sessions" ON public.study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Card reviews
DROP POLICY IF EXISTS "Users can view own card reviews" ON public.card_reviews;
CREATE POLICY "Users can view own card reviews" ON public.card_reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own card reviews" ON public.card_reviews;
CREATE POLICY "Users can insert own card reviews" ON public.card_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- User stats
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats;
CREATE POLICY "Users can insert own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Special policies for service role (needed for triggers and functions)
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename; 