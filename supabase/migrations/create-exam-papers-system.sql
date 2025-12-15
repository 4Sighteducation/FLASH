-- ================================================================
-- EXAM PAPERS SYSTEM - Complete Database Schema
-- Creates all tables needed for the Past Papers feature
-- ================================================================

-- ================================================================
-- 1. EXAM QUESTIONS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES exam_papers(id) ON DELETE CASCADE,
  
  -- Question identification
  full_question_number VARCHAR(20) NOT NULL,  -- "1(a)(i)", "2(b)", etc.
  main_question_number INT NOT NULL,          -- 1, 2, 3, 4, 5, 6
  sub_question_letter VARCHAR(5),             -- 'a', 'b', 'c', null
  sub_sub_question VARCHAR(5),                -- 'i', 'ii', 'iii', null
  
  -- Question content
  question_text TEXT NOT NULL,
  context_text TEXT,                          -- Scenario/stem from parent question
  marks INT NOT NULL,
  
  -- Question metadata
  command_word VARCHAR(50),                   -- "Describe", "Explain", etc.
  question_type VARCHAR(50),                  -- "short_answer", "extended_response", etc.
  
  -- Images
  has_image BOOLEAN DEFAULT false,
  image_url TEXT,                             -- URL in exam-images bucket
  image_description TEXT,                     -- What the image shows
  image_page INT,                             -- Original page number
  
  -- Quality indicators
  has_official_mark_scheme BOOLEAN DEFAULT false,
  has_examiner_insight BOOLEAN DEFAULT false,
  quality_tier INT DEFAULT 3,                 -- 1=Verified, 2=Official, 3=AI
  
  -- Extraction metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  extraction_confidence DECIMAL(3,2),         -- 0.00-1.00
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(paper_id, full_question_number)
);

CREATE INDEX idx_exam_questions_paper ON exam_questions(paper_id);
CREATE INDEX idx_exam_questions_main ON exam_questions(main_question_number);
CREATE INDEX idx_exam_questions_quality ON exam_questions(quality_tier);
CREATE INDEX idx_exam_questions_has_image ON exam_questions(has_image);

-- ================================================================
-- 2. MARK SCHEMES TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS mark_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
  
  -- Mark scheme content
  max_marks INT NOT NULL,
  marking_points JSONB NOT NULL,
  /* Structure:
  [
    {
      "answer": "Ribosome",
      "marks": 1,
      "keywords": ["ribosome", "70S"],
      "alternatives": ["70S ribosome"]
    },
    {
      "answer": "Site of protein synthesis",
      "marks": 1,
      "keywords": ["protein", "synthesis"],
      "accept": true,
      "reject": false
    }
  ]
  */
  
  -- Level-based marking (for extended response)
  levels JSONB,
  /* Structure:
  [
    {
      "level": 1,
      "marks": "1-2",
      "descriptor": "Basic understanding shown",
      "indicators": ["One point made", "Limited detail"]
    },
    {
      "level": 2,
      "marks": "3-4", 
      "descriptor": "Clear explanation",
      "indicators": ["Two points made", "Good detail"]
    }
  ]
  */
  
  -- Examiner guidance
  examiner_notes TEXT,
  common_errors TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mark_schemes_question ON mark_schemes(question_id);

-- ================================================================
-- 3. EXAMINER INSIGHTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS examiner_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES exam_papers(id),
  
  -- Insights from examiner reports
  average_mark DECIMAL(4,2),
  common_errors TEXT[],
  good_practice_examples TEXT[],
  advice_for_students TEXT,
  examiner_comments TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_examiner_insights_question ON examiner_insights(question_id);
CREATE INDEX idx_examiner_insights_paper ON examiner_insights(paper_id);

-- ================================================================
-- 4. STUDENT ATTEMPTS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS student_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES exam_questions(id) ON DELETE CASCADE,
  
  -- Attempt details
  user_answer TEXT NOT NULL,
  marks_awarded INT NOT NULL,
  max_marks INT NOT NULL,
  
  -- AI feedback
  ai_feedback TEXT,
  strengths TEXT[],
  improvements TEXT[],
  matched_marking_points JSONB,           -- Which marking points were hit
  
  -- Metadata
  time_taken_seconds INT,
  is_correct BOOLEAN GENERATED ALWAYS AS (marks_awarded = max_marks) STORED,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_attempts_user ON student_attempts(user_id);
CREATE INDEX idx_student_attempts_question ON student_attempts(question_id);
CREATE INDEX idx_student_attempts_date ON student_attempts(attempted_at DESC);

-- ================================================================
-- 5. PAPER EXTRACTION STATUS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS paper_extraction_status (
  paper_id UUID PRIMARY KEY REFERENCES exam_papers(id) ON DELETE CASCADE,
  
  -- Extraction status
  questions_extracted BOOLEAN DEFAULT false,
  mark_scheme_extracted BOOLEAN DEFAULT false,
  examiner_report_extracted BOOLEAN DEFAULT false,
  images_extracted BOOLEAN DEFAULT false,
  
  -- Extraction metadata
  questions_count INT DEFAULT 0,
  total_marks INT DEFAULT 0,
  images_count INT DEFAULT 0,
  
  -- Extraction timestamps
  questions_extracted_at TIMESTAMPTZ,
  mark_scheme_extracted_at TIMESTAMPTZ,
  examiner_report_extracted_at TIMESTAMPTZ,
  
  -- Quality
  extraction_quality_score DECIMAL(3,2),      -- 0.00-1.00
  extraction_errors JSONB,                     -- Any issues encountered
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- 6. HELPER FUNCTIONS
-- ================================================================

-- Get papers for a user's subject (with quality info)
CREATE OR REPLACE FUNCTION get_user_exam_papers(
  p_user_id UUID,
  p_subject_id UUID
)
RETURNS TABLE (
  paper_id UUID,
  year INT,
  exam_series TEXT,
  paper_number INT,
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  questions_extracted BOOLEAN,
  questions_count INT,
  quality_tier INT,
  has_official_ms BOOLEAN,
  has_examiner_report BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ep.id as paper_id,
    ep.year,
    ep.exam_series,
    ep.paper_number,
    ep.question_paper_url,
    ep.mark_scheme_url,
    ep.examiner_report_url,
    COALESCE(pes.questions_extracted, false) as questions_extracted,
    COALESCE(pes.questions_count, 0) as questions_count,
    CASE 
      WHEN ep.examiner_report_url IS NOT NULL THEN 1
      WHEN ep.mark_scheme_url IS NOT NULL THEN 2
      ELSE 3
    END as quality_tier,
    ep.mark_scheme_url IS NOT NULL as has_official_ms,
    ep.examiner_report_url IS NOT NULL as has_examiner_report
  FROM exam_papers ep
  LEFT JOIN paper_extraction_status pes ON ep.id = pes.paper_id
  WHERE ep.exam_board_subject_id IN (
    SELECT subject_id FROM user_subjects WHERE user_id = p_user_id
  )
  AND ep.exam_board_subject_id = p_subject_id
  ORDER BY ep.year DESC, ep.exam_series, ep.paper_number;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 7. ROW LEVEL SECURITY
-- ================================================================

-- Students can only see their attempts
ALTER TABLE student_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
  ON student_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts"
  ON student_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Questions and mark schemes are public (read-only for students)
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mark_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE examiner_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions"
  ON exam_questions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view mark schemes"
  ON mark_schemes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view examiner insights"
  ON examiner_insights FOR SELECT
  USING (true);

-- ================================================================
-- DONE!
-- ================================================================

SELECT 
  '✅ Exam Papers System Created' as status,
  (SELECT COUNT(*) FROM exam_questions) as questions_ready,
  (SELECT COUNT(*) FROM mark_schemes) as mark_schemes_ready,
  (SELECT COUNT(*) FROM examiner_insights) as insights_ready;

