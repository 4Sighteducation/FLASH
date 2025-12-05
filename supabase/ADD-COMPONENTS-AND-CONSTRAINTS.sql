-- ================================================================
-- ADD COMPONENTS & CONSTRAINTS FOR COMPLEX SUBJECTS
-- ================================================================
-- Needed for: History, Art and Design, and other pathway subjects
-- ================================================================

-- ================================================================
-- 1. COMPONENTS (Selection Rules)
-- ================================================================
CREATE TABLE IF NOT EXISTS staging_aqa_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_aqa_subjects(id) ON DELETE CASCADE,
  
  -- Component info
  component_code TEXT NOT NULL,           -- e.g., "Component 1", "Component 2A"
  component_name TEXT NOT NULL,           -- e.g., "Breadth study"
  component_type TEXT,                    -- e.g., "Written exam", "Coursework"
  
  -- Selection rules
  selection_type TEXT CHECK (selection_type IN ('choose_one', 'choose_multiple', 'required_all')),
  count_required INTEGER,                 -- e.g., "Choose 2 from..."
  total_available INTEGER,                -- e.g., "...11 options"
  
  -- Assessment
  assessment_weight TEXT,                 -- e.g., "40%"
  assessment_format TEXT,                 -- e.g., "2 hours 15 min written exam"
  assessment_description TEXT,
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(subject_id, component_code)
);

CREATE INDEX idx_staging_aqa_components_subject ON staging_aqa_components(subject_id);

-- ================================================================
-- 2. CONSTRAINTS (Validation Rules)
-- ================================================================
CREATE TABLE IF NOT EXISTS staging_aqa_constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES staging_aqa_subjects(id) ON DELETE CASCADE,
  
  -- Constraint details
  constraint_type TEXT CHECK (constraint_type IN (
    'geographic_requirement',     -- e.g., "40% British history"
    'chronological_requirement',  -- e.g., "Must cover 3 eras"
    'timescale_requirement',      -- e.g., "Must have depth, period, thematic"
    'prohibited_combination',     -- e.g., "Can't choose 1A and 1B together"
    'minimum_coverage',           -- e.g., "At least 50 years"
    'general'
  )),
  
  description TEXT NOT NULL,              -- Human-readable rule
  constraint_rule JSONB,                  -- Structured rule data
  applies_to_components TEXT[],           -- Which components this affects
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staging_aqa_constraints_subject ON staging_aqa_constraints(subject_id);

-- ================================================================
-- 3. TOPIC METADATA (For Options)
-- ================================================================
CREATE TABLE IF NOT EXISTS staging_aqa_topic_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES staging_aqa_topics(id) ON DELETE CASCADE,
  
  -- Historical context (for History)
  chronological_era TEXT,                 -- e.g., "Medieval", "Early Modern", "Modern"
  period_start_year INTEGER,              -- e.g., 1485
  period_end_year INTEGER,                -- e.g., 1603
  timescale_type TEXT,                    -- e.g., "depth", "period", "thematic"
  geographical_context TEXT,              -- e.g., "British", "European", "Wider World"
  
  -- Pathway info (for Art)
  pathway_name TEXT,                      -- e.g., "Fine art", "Photography"
  
  -- Component linkage
  belongs_to_component TEXT,              -- e.g., "Component 1"
  
  -- General metadata
  key_themes JSONB,                       -- Array of themes
  additional_info JSONB,                  -- Flexible field for subject-specific data
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(topic_id)
);

CREATE INDEX idx_staging_aqa_topic_metadata_topic ON staging_aqa_topic_metadata(topic_id);

-- ================================================================
-- 4. VERIFICATION
-- ================================================================
SELECT 
  '✅ COMPONENTS & CONSTRAINTS TABLES CREATED' as status,
  tablename
FROM pg_tables
WHERE tablename IN ('staging_aqa_components', 'staging_aqa_constraints', 'staging_aqa_topic_metadata')
  AND schemaname = 'public'
ORDER BY tablename;

-- ================================================================
-- EXAMPLE DATA FOR HISTORY
-- ================================================================
/*
HISTORY GCSE (8145) Example:

Components:
- Component 1: Choose 1 from 11 options (1A-1K)
  * 1A: Tudors (British, Early Modern, 1485-1603, Depth)
  * 1B: Elizabethan England (British, Early Modern, 1568-1603, Depth)
  * 1C: Norman England (British, Medieval, 1066-1100, Depth)
  ...

Constraints:
- "At least 40% British history" (geographic_requirement)
- "Must cover Medieval, Early Modern, and Modern eras" (chronological_requirement)
- "Must include depth, period, and thematic studies" (timescale_requirement)

Topic Metadata (for option 1A):
- topic_code: "1A"
- topic_name: "America, 1840-1895: Expansion and consolidation"
- chronological_era: "Modern"
- period_start_year: 1840
- period_end_year: 1895
- timescale_type: "depth"
- geographical_context: "Wider World"
- belongs_to_component: "Component 1"
*/

-- ================================================================
-- EXAMPLE DATA FOR ART AND DESIGN
-- ================================================================
/*
ART & DESIGN A-Level (7201-7207) Example:

Subject:
- Name: "Art and Design"
- Code: "7201" (base code, or use range)

Components:
- Component 1: Personal investigation (60%)
- Component 2: Externally set assignment (40%)

Topics (Pathways):
- Fine art (7202)
- Photography (7206)
- Graphic communication (7203)
- Textile design (7204)
- Three-dimensional design (7205)
- Art, craft and design (7201)

Constraints:
- "Must demonstrate skills across chosen pathway"
- "Portfolio must show sustained investigation"

Topic Metadata:
- pathway_name: "Fine art", "Photography", etc.
- Pathway defines the assessment focus, not separate topics
*/

