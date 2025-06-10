-- Step 1: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create exam boards table
CREATE TABLE IF NOT EXISTS exam_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    country TEXT NOT NULL,
    website_url TEXT,
    logo_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create qualification types table
CREATE TABLE IF NOT EXISTS qualification_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create exam board subjects table
CREATE TABLE IF NOT EXISTS exam_board_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_id UUID REFERENCES exam_boards(id),
    qualification_type_id UUID REFERENCES qualification_types(id),
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    specification_code TEXT,
    specification_url TEXT,
    first_teaching DATE,
    first_exam DATE,
    last_exam DATE,
    version TEXT,
    is_current BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(exam_board_id, qualification_type_id, subject_code)
);

-- Step 5: Create curriculum topics table
CREATE TABLE IF NOT EXISTS curriculum_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_board_subject_id UUID REFERENCES exam_board_subjects(id),
    parent_topic_id UUID REFERENCES curriculum_topics(id),
    topic_code TEXT,
    topic_name TEXT NOT NULL,
    topic_level INTEGER,
    description TEXT,
    learning_objectives JSONB,
    assessment_weight DECIMAL(5,2),
    teaching_hours INTEGER,
    prerequisites JSONB,
    resources JSONB,
    metadata JSONB,
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_board_subject ON curriculum_topics(exam_board_subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_topics_parent ON curriculum_topics(parent_topic_id);
CREATE INDEX IF NOT EXISTS idx_exam_board_subjects_current ON exam_board_subjects(is_current) WHERE is_current = true;

-- Step 7: Enable Row Level Security (but with open policies for now)
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_board_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;

-- Step 8: Create open policies for reading (you can restrict later)
CREATE POLICY "Allow public read access" ON exam_boards FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON qualification_types FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON exam_board_subjects FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON curriculum_topics FOR SELECT USING (true);

-- If you're logged in as admin, allow all operations
CREATE POLICY "Allow admin full access" ON exam_boards FOR ALL USING (true);
CREATE POLICY "Allow admin full access" ON qualification_types FOR ALL USING (true);
CREATE POLICY "Allow admin full access" ON exam_board_subjects FOR ALL USING (true);
CREATE POLICY "Allow admin full access" ON curriculum_topics FOR ALL USING (true); 