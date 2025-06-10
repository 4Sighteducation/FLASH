-- Enhanced Supabase Schema for Commercial Flashcard App
-- Includes gamification, social features, and mobile optimizations

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- User profiles with gamification
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Gamification fields
    xp_total INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_current INTEGER DEFAULT 0,
    streak_longest INTEGER DEFAULT 0,
    last_study_date DATE,
    
    -- Preferences
    notification_settings JSONB DEFAULT '{"daily_reminder": true, "achievement_alerts": true, "time": "09:00"}',
    theme_preference TEXT DEFAULT 'system',
    
    -- Subscription
    subscription_tier TEXT DEFAULT 'free', -- free, premium, pro
    subscription_expires_at TIMESTAMPTZ,
    
    -- Stats
    total_cards_studied INTEGER DEFAULT 0,
    total_study_time_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EXAM BOARD REFERENCE DATA (Critical for accuracy)
-- =====================================================

-- Core exam board reference table
CREATE TABLE public.exam_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- 'AQA', 'EDEXCEL', etc.
    full_name TEXT NOT NULL,
    country TEXT NOT NULL, -- 'UK', 'International'
    website_url TEXT,
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Qualification types (GCSE, A-Level, etc.)
CREATE TABLE public.qualification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- 'GCSE', 'A_LEVEL', 'IB'
    name TEXT NOT NULL,
    level INTEGER, -- Academic level (1-5)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subjects offered by exam boards
CREATE TABLE public.exam_board_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_id UUID REFERENCES public.exam_boards(id),
    qualification_type_id UUID REFERENCES public.qualification_types(id),
    subject_code TEXT NOT NULL, -- Board's subject code
    subject_name TEXT NOT NULL,
    specification_code TEXT, -- e.g., '8300' for AQA GCSE Maths
    specification_url TEXT, -- Direct link to PDF/webpage
    first_teaching DATE,
    first_exam DATE,
    last_exam DATE, -- For phasing out specs
    version TEXT, -- Specification version
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_board_id, qualification_type_id, subject_code)
);

-- Detailed curriculum structure
CREATE TABLE public.curriculum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_subject_id UUID REFERENCES public.exam_board_subjects(id),
    parent_topic_id UUID REFERENCES public.curriculum_topics(id), -- For hierarchy
    topic_code TEXT, -- Board's topic code (e.g., '4.1.2')
    topic_name TEXT NOT NULL,
    topic_level INTEGER, -- 1=Module, 2=Topic, 3=Subtopic
    description TEXT,
    learning_objectives JSONB, -- Array of objectives
    assessment_weight DECIMAL(5,2), -- Percentage weight in exam
    teaching_hours INTEGER, -- Recommended hours
    prerequisites JSONB, -- Array of prerequisite topic IDs
    resources JSONB, -- Links to official resources
    metadata JSONB, -- Additional board-specific data
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track scraping history
CREATE TABLE public.scrape_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_id UUID REFERENCES public.exam_boards(id),
    scrape_type TEXT, -- 'full', 'incremental', 'check'
    status TEXT, -- 'running', 'completed', 'failed'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_added INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_removed INTEGER DEFAULT 0,
    error_log JSONB,
    metadata JSONB -- Store scrape configuration
);

-- Version tracking for curriculum changes
CREATE TABLE public.curriculum_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_subject_id UUID REFERENCES public.exam_board_subjects(id),
    version_date DATE NOT NULL,
    change_summary TEXT,
    change_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER CONTENT TABLES (Enhanced with exam board links)
-- =====================================================

-- Achievements system
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    xp_reward INTEGER DEFAULT 0,
    category TEXT, -- 'streak', 'study', 'social', 'creation'
    requirement_type TEXT, -- 'count', 'streak', 'special'
    requirement_value INTEGER,
    is_secret BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (many-to-many)
CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Enhanced subjects with exam board connection
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT, -- emoji or icon identifier
    
    -- Link to exam board curriculum
    exam_board_subject_id UUID REFERENCES public.exam_board_subjects(id),
    
    is_public BOOLEAN DEFAULT FALSE,
    share_code TEXT UNIQUE, -- For sharing
    
    -- Stats
    total_cards INTEGER DEFAULT 0,
    mastery_percentage DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- Enhanced topics linked to curriculum
CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    difficulty_level INTEGER DEFAULT 1, -- 1-5
    
    -- Link to official curriculum
    curriculum_topic_id UUID REFERENCES public.curriculum_topics(id),
    
    -- Stats
    total_cards INTEGER DEFAULT 0,
    mastery_percentage DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (subject_id, name)
);

-- Enhanced flashcards with more features
CREATE TABLE public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    
    -- Core content
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    question_type TEXT NOT NULL, -- 'multiple_choice', 'short_answer', 'essay', 'true_false'
    
    -- Enhanced content
    options JSONB, -- For multiple choice
    hints JSONB, -- Array of progressive hints
    explanation TEXT, -- Detailed explanation
    
    -- Media
    question_image_url TEXT,
    answer_image_url TEXT,
    audio_url TEXT,
    
    -- Metadata
    difficulty INTEGER DEFAULT 3, -- 1-5
    tags TEXT[], -- Array of tags
    source TEXT, -- 'ai_generated', 'user_created', 'imported'
    ai_quality_score DECIMAL(3,2), -- 0-1 score from AI
    
    -- Link to curriculum if AI generated from specific topic
    curriculum_topic_id UUID REFERENCES public.curriculum_topics(id),
    
    -- Study stats
    times_studied INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    average_time_seconds INTEGER,
    last_studied_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced study box system with spaced repetition
CREATE TABLE public.study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    
    -- Leitner box system
    box_number INTEGER NOT NULL DEFAULT 1 CHECK (box_number >= 1 AND box_number <= 5),
    
    -- Spaced repetition data
    ease_factor DECIMAL(3,2) DEFAULT 2.5, -- For SM-2 algorithm
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    
    -- Scheduling
    next_review_at TIMESTAMPTZ NOT NULL,
    last_reviewed_at TIMESTAMPTZ,
    
    -- Performance tracking
    consecutive_correct INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, flashcard_id)
);

-- Study history for analytics
CREATE TABLE public.study_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    session_id UUID, -- Group cards studied in same session
    
    -- Performance
    was_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    confidence_rating INTEGER, -- 1-5 user self-rating
    
    -- Context
    box_number_before INTEGER,
    box_number_after INTEGER,
    
    studied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily challenges
CREATE TABLE public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    xp_reward INTEGER DEFAULT 100,
    
    -- Challenge criteria
    criteria JSONB NOT NULL, -- e.g., {"type": "study_cards", "count": 50}
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User challenge progress
CREATE TABLE public.user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Study groups for social features
CREATE TABLE public.study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 8),
    is_public BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT 50,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study group members
CREATE TABLE public.study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Shared card sets
CREATE TABLE public.shared_card_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    share_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 8),
    download_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_flashcards_user_topic ON public.flashcards(user_id, topic_id);
CREATE INDEX idx_study_sessions_next_review ON public.study_sessions(user_id, next_review_at);
CREATE INDEX idx_study_history_user_date ON public.study_history(user_id, studied_at);
CREATE INDEX idx_flashcards_search ON public.flashcards USING gin(to_tsvector('english', question || ' ' || answer));
CREATE INDEX idx_curriculum_topics_board_subject ON public.curriculum_topics(exam_board_subject_id);
CREATE INDEX idx_curriculum_topics_parent ON public.curriculum_topics(parent_topic_id);
CREATE INDEX idx_exam_board_subjects_current ON public.exam_board_subjects(is_current) WHERE is_current = true;

-- Full text search for flashcards
ALTER TABLE public.flashcards ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_flashcard_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.question, '') || ' ' || COALESCE(NEW.answer, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_flashcard_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.flashcards
FOR EACH ROW EXECUTE FUNCTION update_flashcard_search_vector();

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_board_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_card_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own data" ON public.profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage their own subjects" ON public.subjects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own topics" ON public.topics
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read access for exam board data
CREATE POLICY "Exam boards are viewable by all" ON public.exam_boards
    FOR SELECT USING (true);

CREATE POLICY "Qualification types are viewable by all" ON public.qualification_types
    FOR SELECT USING (true);

CREATE POLICY "Exam board subjects are viewable by all" ON public.exam_board_subjects
    FOR SELECT USING (true);

CREATE POLICY "Curriculum topics are viewable by all" ON public.curriculum_topics
    FOR SELECT USING (true);

-- Public achievements are viewable by all
CREATE POLICY "Achievements are viewable by all" ON public.achievements
    FOR SELECT USING (true);

-- Admin-only policies for exam board data management
CREATE POLICY "Only admins can manage exam boards" ON public.exam_boards
    FOR INSERT UPDATE DELETE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can manage curriculum" ON public.curriculum_topics
    FOR INSERT UPDATE DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Add more specific policies for social features, sharing, etc. 