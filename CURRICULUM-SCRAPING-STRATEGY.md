# FLASH Curriculum Scraping Strategy
## Comprehensive Deep Dive & Implementation Plan

**Date:** November 2, 2025  
**Status:** Strategic Planning Phase  
**Goal:** Create accurate, maintainable, exam board-specific topic databases

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Database Schema (Production - FLASH App)

**Current Structure:**
```
exam_boards (AQA, OCR, Edexcel/Pearson, WJEC, CCEA, SQA)
├── qualification_types (A_LEVEL, GCSE, AS_LEVEL)
│   └── exam_board_subjects (subject + board + qual type combo)
│       └── curriculum_topics (hierarchical: 3 levels)
│           ├── Level 1: Modules
│           ├── Level 2: Topics
│           └── Level 3: Sub Topics
```

**Key Tables:**

1. **`exam_boards`**
   - Stores: AQA, OCR, Edexcel, WJEC, CCEA, SQA
   - Fields: `id`, `code`, `full_name`, `created_at`

2. **`qualification_types`**
   - Stores: A_LEVEL, GCSE, AS_LEVEL
   - Fields: `id`, `code`, `name`, `created_at`

3. **`exam_board_subjects`**
   - Links: exam_board_id + qualification_type_id + subject_name
   - Fields: `id`, `exam_board_id`, `qualification_type_id`, `subject_name`, `is_current`
   - Example: "AQA + A_LEVEL + Mathematics (A-Level)"

4. **`curriculum_topics`**
   - Hierarchical structure with parent-child relationships
   - Fields: `id`, `exam_board_subject_id`, `parent_topic_id`, `topic_name`, `topic_code`, `topic_level`, `sort_order`
   - Current count: ~22,770 topics across all boards

5. **`user_topics`**
   - Links users to selected curriculum topics
   - Fields: `id`, `user_id`, `topic_id`, `created_at`

6. **`user_custom_topics`**
   - User-edited/custom topics
   - Fields: `id`, `user_id`, `subject_id`, `parent_topic_id`, `title`, `is_custom`, `is_deleted`, `sort_order`

### 1.2 Identified Problems

**Critical Issues:**
1. ❌ **Data Accumulation:** AQA Accounting has "hundreds of topics" - suggests duplicate scraping runs have accumulated
2. ❌ **Inconsistent Quality:** Good data for AQA, Edexcel, OCR; poor data for CCEA, WJEC, SQA
3. ❌ **No Version Control:** No tracking of when topics were scraped or spec version
4. ❌ **Mixed Approaches:** Multiple scraper projects with different methodologies
5. ❌ **No Exam Papers Integration:** Original plan included papers/mark schemes but not implemented

**Data Quality Assessment:**
- ✅ **Good:** AQA, Edexcel, OCR (historical data from original import)
- ⚠️ **Moderate:** WJEC (some data but incomplete)
- ❌ **Poor:** CCEA, SQA (minimal/inconsistent data)

### 1.3 Existing Scraper Projects

**Project 1: `flash-curriculum-pipeline/`**
- **Purpose:** Supabase-direct scraping with isolated AQA database
- **Status:** Partially successful
- **Key Features:**
  - Separate AQA schema (`aqa_subjects`, `aqa_topics`, `aqa_components`, etc.)
  - Recursive web scraping (navigates into subsection pages)
  - Supports exam papers, mark schemes, examiner reports
  - Built-in hierarchy detection (topic levels 0-3)
- **Problems:** Only partially working; accumulation issues

**Project 2: `Topic List Scraper/`**
- **Purpose:** Original scraper using Knack for data storage
- **Status:** Legacy; data was imported to Supabase
- **Scrapers Available:**
  - `aqa_scraper.py`
  - `ocr_scraper.py`
  - `edexcel_scraper.py`
  - `wjec_scraper.py`
  - `ccea_scraper.py`
  - `sqa_scraper.py`
  - Multiple PDF/exam paper scrapers

**Common Pattern:**
Both projects use BeautifulSoup/requests for web scraping, but lack:
- Consistent spec version tracking
- Firecrawl for complex JS sites
- Board-specific rule engines
- Staging → Production data flow

---

## 2. PROPOSED SOLUTION: FIRECRAWL-BASED ARCHITECTURE

### 2.1 Core Principles

1. **Separation of Concerns:** Staging database ≠ Production database
2. **Board-Specific Processes:** Each exam board gets its own scraping logic
3. **Version Tracking:** Store spec version, PDF hash, scrape date
4. **Incremental Adoption:** Roll out one board at a time
5. **Reversible:** Can delete/replace entire board datasets atomically

### 2.2 Database Strategy

**Create Separate Staging Schemas:**
```
public schema (production - current)
├── exam_boards
├── exam_board_subjects
├── curriculum_topics
└── ... (user tables)

staging_aqa schema
├── aqa_subjects
├── aqa_topics
├── aqa_components
├── aqa_constraints
├── aqa_exam_papers
├── aqa_mark_scheme_insights
├── aqa_examiner_report_insights
└── aqa_question_bank

staging_ocr schema
├── ocr_subjects
├── ocr_topics
├── ocr_modules
└── ocr_exam_papers

staging_edexcel schema
├── edexcel_subjects
├── edexcel_topics
└── ... (similar structure)

... (WJEC, CCEA, SQA)
```

**Benefit:** Test/validate/perfect each board's data independently, then atomically replace production data when ready.

### 2.3 Staging Schema (Per Board)

**Example: AQA (already exists in flash-curriculum-pipeline)**

```sql
-- Already created in flash-curriculum-pipeline/database/schemas/CREATE-AQA-SCHEMA.sql

CREATE TABLE aqa_subjects (
  id UUID PRIMARY KEY,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,                    -- e.g., "7402" for Biology
  qualification_type TEXT CHECK (IN 'A-Level', 'GCSE'),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,                              -- Track spec version
  spec_pdf_sha256 TEXT,                          -- Detect changes
  last_scraped TIMESTAMP,
  scraper_version TEXT DEFAULT 'v1.0',
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE aqa_topics (
  id UUID PRIMARY KEY,
  subject_id UUID REFERENCES aqa_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES aqa_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,                      -- e.g., "3.1", "A", "1A"
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (>= 0 AND <= 3),     -- 0=main unit, 1-3=nested
  description TEXT,
  -- Optional: exam-specific metadata
  component_code TEXT,
  chronological_period TEXT,
  key_themes JSONB,
  UNIQUE(subject_id, topic_code)
);

CREATE TABLE aqa_exam_papers (
  id UUID PRIMARY KEY,
  subject_id UUID REFERENCES aqa_subjects(id),
  year INTEGER,
  exam_series TEXT CHECK (IN 'June', 'November'),
  paper_number INTEGER,
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  UNIQUE(subject_id, year, exam_series, paper_number)
);

-- Additional tables: aqa_components, aqa_constraints, aqa_mark_scheme_insights, etc.
```

**Similar schemas for other boards:**
- `staging_ocr`: Use OCR's "Modules 1-6" structure
- `staging_edexcel`: Use "Topics 1-10" structure
- `staging_wjec`: PDF-first approach
- `staging_ccea`: rewardinglearning.org.uk links
- `staging_sqa`: SQA-specific structure

### 2.4 Migration Path (Staging → Production)

**Once a board's data is validated:**

```sql
-- Example: Replace all AQA A-Level Biology in production

BEGIN;

-- 1. Delete existing AQA Biology curriculum topics
DELETE FROM curriculum_topics
WHERE exam_board_subject_id IN (
  SELECT id FROM exam_board_subjects ebs
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = 'AQA'
    AND ebs.subject_name = 'Biology (A-Level)'
);

-- 2. Insert from staging
INSERT INTO curriculum_topics (
  exam_board_subject_id,
  parent_topic_id,
  topic_name,
  topic_code,
  topic_level,
  sort_order
)
SELECT
  (SELECT id FROM exam_board_subjects ebs
   JOIN exam_boards eb ON ebs.exam_board_id = eb.id
   WHERE eb.code = 'AQA' AND ebs.subject_name = 'Biology (A-Level)'),
  -- Map parent_topic_id using temp table
  mapped_parent.id,
  aqa_topics.topic_name,
  aqa_topics.topic_code,
  aqa_topics.topic_level + 1,  -- Adjust levels (staging 0-3 → production 1-4)
  ROW_NUMBER() OVER (PARTITION BY parent_topic_id ORDER BY topic_code)
FROM aqa_topics
JOIN aqa_subjects ON aqa_topics.subject_id = aqa_subjects.id
WHERE aqa_subjects.subject_code = '7402';

COMMIT;
```

**Benefits:**
- ✅ Atomic replacement (all-or-nothing transaction)
- ✅ Can test in staging without affecting users
- ✅ Can rollback if issues found
- ✅ Preserve user_topics links (they reference curriculum_topics.id, so remap carefully)

---

## 3. FIRECRAWL INTEGRATION STRATEGY

### 3.1 Why Firecrawl?

**Problems It Solves:**
1. ✅ **JS-Heavy Sites:** Many boards use JavaScript navigation
2. ✅ **PDF Parsing:** Automatic PDF → text conversion
3. ✅ **Discovery:** `/map` endpoint finds all spec pages automatically
4. ✅ **Clean Output:** LLM-ready markdown (easier to parse)
5. ✅ **Rate Limiting:** Built-in concurrency control

### 3.2 Firecrawl Workflow Per Board

**Phase 1: Discovery**
```bash
# Use /map to find all A-level subject content pages
curl -X POST https://api.firecrawl.dev/v2/map \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.aqa.org.uk/subjects",
    "search": "a-level specification/subject-content",
    "limit": 5000,
    "sitemap": "include"
  }'
# Returns: List of all A-level subject content URLs
```

**Phase 2: Scoped Crawl**
```bash
# Crawl only subject-content pages + spec PDFs
curl -X POST https://api.firecrawl.dev/v2/crawl \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.aqa.org.uk/subjects",
    "includePaths": [
      "subjects/.*/a-level/.*/specification/(subject-content|specification-at-a-glance).*",
      "resources/.*/specifications/.*\\.pdf"
    ],
    "ignoreQueryParameters": true,
    "allowExternalLinks": false,
    "maxDiscoveryDepth": 4,
    "limit": 1200,
    "maxConcurrency": 4,
    "scrapeOptions": {
      "formats": ["markdown", "html"],
      "parsers": ["pdf"],
      "onlyMainContent": true
    }
  }'
# Returns: Clean markdown + HTML for each page, PDFs converted to text
```

**Phase 3: Deterministic Parsing**
```python
# Parse headings from Firecrawl markdown output
import re

def extract_topics_from_markdown(md_content):
    """
    Extract topics using heading patterns:
    - Numbered: 3.1, 3.1.1, 3.3.10
    - Lettered: A:, B:, C: (Maths)
    - Options: 1A, 1B, 2A (History)
    - Modules: Module 1, Topic 2
    """
    topics = []
    patterns = [
        r'^#{2,4}\s+(\d+(?:\.\d+)+)\s+(.+)$',      # 3.1 Biology
        r'^#{2,4}\s+([A-S]):\s+(.+)$',             # A: Proof
        r'^#{2,4}\s+(\d+[A-Z])\s+(.+)$',           # 1A Tudors
        r'^#{2,4}\s+(Module|Topic)\s+(\d+):?\s+(.+)$'  # Module 1: X
    ]
    
    for line in md_content.split('\n'):
        for pattern in patterns:
            m = re.match(pattern, line)
            if m:
                # Extract code, title, determine level from heading depth
                topics.append({
                    'code': m.group(1),
                    'title': m.group(2) if len(m.groups()) == 2 else m.group(3),
                    'level': len(re.match(r'^(#{2,4})', line).group(1)) - 1
                })
    
    return build_hierarchy(topics)
```

### 3.3 Board-Specific Firecrawl Configs

**AQA**
```javascript
{
  url: "https://www.aqa.org.uk/subjects",
  includePaths: [
    "subjects/.*/a-level/.*/specification/(subject-content|specification-at-a-glance).*",
    "resources/.*/specifications/.*\\.pdf"
  ],
  notes: "HTML-first; use PDF for fallback. Biology 3.1-3.7, Maths A-S, History 1A-1W"
}
```

**OCR**
```javascript
{
  url: "https://www.ocr.org.uk/qualifications/as-and-a-level/",
  includePaths: [
    ".*/as-and-a-level/.*/from-2015/(specification-at-a-glance|.*content.*).*",
    "Images/.*\\.pdf"
  ],
  notes: "Modules 1-6 structure. Biology A Modules 1-6."
}
```

**Pearson Edexcel**
```javascript
{
  url: "https://qualifications.pearson.com/en/qualifications/edexcel-a-levels.html",
  includePaths: [
    "content/dam/pdf/A%20Level/.*/.*\\.pdf",
    "en/qualifications/edexcel-a-levels/.*"
  ],
  notes: "PDF-first. Topics 1-10 structure (Biology B 9BI0)"
}
```

**WJEC/Eduqas**
```javascript
{
  url: "https://www.eduqas.co.uk/qualifications/",
  includePaths: [
    "qualifications/.*/asa-level/.*",
    "media/.*\\.pdf"
  ],
  allowSubdomains: true,
  notes: "PDF-first specifications"
}
```

**CCEA**
```javascript
{
  url: "https://www.rewardinglearning.org.uk/",
  includePaths: [
    "common/includes/microsite_doc_link\\.aspx\\?docid=.*",
    ".*GCE.*Biology.*|.*GCE.*Mathematics.*"
  ],
  allowSubdomains: true,
  notes: "Spec access via rewardinglearning doc links"
}
```

---

## 4. PROPOSED IMPLEMENTATION PLAN

### Phase 1: Infrastructure Setup (Week 1)

**Tasks:**
1. ✅ **Create Staging Schemas**
   - Run `CREATE-AQA-SCHEMA.sql` (already exists)
   - Create similar schemas for OCR, Edexcel, WJEC, CCEA, SQA
   - Add version tracking, spec_pdf_sha256 fields

2. ✅ **Set Up Firecrawl Integration**
   - Install Firecrawl SDK: `npm install @mendable/firecrawl-js`
   - Create environment variable: `FIRECRAWL_API_KEY`
   - Test with single subject (AQA Biology)

3. ✅ **Create Parsing Library**
   - Build deterministic heading parser (Python + Node versions)
   - Support all patterns: numbered (3.1), lettered (A:), options (1A), modules
   - Validate against known good examples

**Deliverable:** Staging infrastructure ready; Firecrawl tested; Parser validated

### Phase 2: AQA Complete Scrape (Week 2-3)

**Goal:** Perfect all ~68 AQA A-level subjects

**Process:**
1. **Run Firecrawl Discovery**
   - Map all AQA A-level subject pages
   - Identify HTML vs PDF-primary subjects

2. **Scrape All Subjects**
   - Use Firecrawl crawl with AQA config
   - Parse markdown → topic hierarchy
   - Upload to `aqa_subjects` + `aqa_topics`

3. **Quality Validation**
   - Cross-check topic counts against spec index
   - AQA Biology: Should have 3.1-3.7 (7 top-level topics)
   - AQA Maths: Should have A-S present
   - AQA History: Should have 1A-1W option codes

4. **Exam Papers (Optional)**
   - Scrape past papers, mark schemes, examiner reports
   - Upload to `aqa_exam_papers`
   - Use AI to extract insights (optional v2 feature)

**Acceptance Criteria:**
- ✅ All 68 AQA A-level subjects scraped
- ✅ Topic counts match official spec indices
- ✅ Hierarchy preserved (0-3 levels)
- ✅ Spec version + PDF hash stored
- ✅ No duplicates

**Deliverable:** Complete, validated AQA staging database

### Phase 3: AQA Production Migration (Week 4)

**Tasks:**
1. **Delete Existing AQA Data**
   ```sql
   DELETE FROM curriculum_topics
   WHERE exam_board_subject_id IN (
     SELECT id FROM exam_board_subjects ebs
     JOIN exam_boards eb ON ebs.exam_board_id = eb.id
     WHERE eb.code = 'AQA'
   );
   ```

2. **Map & Insert from Staging**
   - Create temp mapping table for parent_topic_id remapping
   - Insert modules (level 1), topics (level 2), subtopics (level 3)
   - Preserve sort_order

3. **Validation in App**
   - Test onboarding flow with AQA subjects
   - Verify topic counts in TopicEditModal
   - Check for duplicates in AQA Accounting specifically

4. **Rollback Plan**
   - Keep backup of old AQA data for 2 weeks
   - If issues found, restore from backup

**Acceptance Criteria:**
- ✅ AQA Accounting shows ~50-100 topics (not hundreds)
- ✅ All AQA subjects display correctly in app
- ✅ No user_topics links broken
- ✅ Topic hierarchy intact

**Deliverable:** Clean AQA data in production

### Phase 4: OCR Complete Scrape (Week 5-6)

**Repeat Phase 2-3 process for OCR:**
- Create `staging_ocr` schema
- Firecrawl with OCR config
- Validate Modules 1-6 structure
- Migrate to production

### Phase 5: Edexcel, WJEC, CCEA, SQA (Week 7-12)

**Roll out remaining boards one at a time:**
- Each board gets 1-2 weeks
- Follow same staging → validation → production flow
- Document board-specific quirks

### Phase 6: Exam Papers & Insights (Future)

**Optional v2 features:**
- Scrape past papers (2015-2024)
- Extract mark schemes with AI
- Parse examiner reports for common mistakes
- Build question bank for AI flashcard generation

---

## 5. FIRECRAWL CODE TEMPLATES

### 5.1 Node.js Scraper (General Purpose)

```javascript
// firecrawl-scraper.js
import Firecrawl from '@mendable/firecrawl-js';
import crypto from 'crypto';
import fs from 'fs/promises';

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

const BOARD_CONFIGS = {
  AQA: {
    url: "https://www.aqa.org.uk/subjects",
    includePaths: [
      "subjects/.*/a-level/.*/specification/(subject-content|specification-at-a-glance).*",
      "resources/.*/specifications/.*\\.pdf"
    ],
    maxDepth: 4,
    maxConcurrency: 4
  },
  OCR: {
    url: "https://www.ocr.org.uk/qualifications/as-and-a-level/",
    includePaths: [
      ".*/as-and-a-level/.*/from-2015/(specification-at-a-glance|.*content.*).*",
      "Images/.*\\.pdf"
    ],
    maxDepth: 4,
    maxConcurrency: 4
  },
  // ... other boards
};

async function scrapeBoard(boardName) {
  const config = BOARD_CONFIGS[boardName];
  
  console.log(`🔍 Discovering ${boardName} pages...`);
  const map = await fc.mapUrl(config.url, {
    search: 'a-level specification',
    limit: 5000
  });
  
  console.log(`📥 Crawling ${map.links?.length || 0} discovered pages...`);
  const crawl = await fc.crawlUrl(config.url, {
    includePaths: config.includePaths,
    ignoreQueryParameters: true,
    allowExternalLinks: false,
    allowSubdomains: false,
    maxDiscoveryDepth: config.maxDepth,
    maxConcurrency: config.maxConcurrency,
    scrapeOptions: {
      formats: ['markdown', 'html'],
      parsers: ['pdf'],
      onlyMainContent: true
    }
  });
  
  console.log(`✅ Scraped ${crawl.data?.length || 0} pages`);
  
  // Save raw data
  await fs.writeFile(
    `data/raw/${boardName}_crawl.json`,
    JSON.stringify(crawl, null, 2)
  );
  
  return crawl.data;
}

async function parseAndUpload(boardName, crawlData) {
  for (const page of crawlData) {
    const markdown = page.markdown || page.html || '';
    const topics = extractTopicsFromMarkdown(markdown);
    
    // Upload to staging database
    await uploadToStaging(boardName, {
      url: page.metadata?.sourceURL,
      topics,
      spec_version: extractSpecVersion(markdown),
      pdf_sha256: isPDF(page) ? sha256(page.rawHtml) : null
    });
  }
}

function extractTopicsFromMarkdown(md) {
  const topics = [];
  const lines = md.split('\n');
  
  const patterns = [
    /^#{2,4}\s+(\d+(?:\.\d+)+)\s+(.+)$/,      // 3.1 Biology
    /^#{2,4}\s+([A-S]):\s+(.+)$/,             // A: Proof
    /^#{2,4}\s+(\d+[A-Z])\s+(.+)$/,           // 1A Tudors
    /^#{2,4}\s+(Module|Topic)\s+(\d+):?\s+(.+)$/  // Module 1
  ];
  
  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,4})\s+(.+)$/);
    if (!headingMatch) continue;
    
    const level = headingMatch[1].length - 1;
    const content = headingMatch[2];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        topics.push({
          code: match[1],
          title: match[2] || match[3],
          level: level,
          raw: line
        });
        break;
      }
    }
  }
  
  return buildHierarchy(topics);
}

function buildHierarchy(topics) {
  // Assign parent_topic_id based on level nesting
  const stack = [];
  const result = [];
  
  for (const topic of topics) {
    // Pop stack until we find a parent with lower level
    while (stack.length && stack[stack.length - 1].level >= topic.level) {
      stack.pop();
    }
    
    topic.parent_code = stack.length ? stack[stack.length - 1].code : null;
    stack.push(topic);
    result.push(topic);
  }
  
  return result;
}

// Run for all boards
async function main() {
  const boards = ['AQA', 'OCR', 'Edexcel', 'WJEC', 'CCEA'];
  
  for (const board of boards) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting ${board}...`);
    console.log('='.repeat(60));
    
    const data = await scrapeBoard(board);
    await parseAndUpload(board, data);
    
    console.log(`✅ ${board} complete!\n`);
  }
}

main().catch(console.error);
```

### 5.2 Python Parser (For flash-curriculum-pipeline)

```python
# firecrawl_parser.py
import re
import json
from typing import List, Dict, Optional

class TopicParser:
    """Deterministic topic parser for UK exam boards."""
    
    PATTERNS = [
        (r'^(\d+(?:\.\d+)+)\s+(.+)$', 'numbered'),       # 3.1, 3.1.1
        (r'^([A-S]):\s+(.+)$', 'lettered'),              # A:, B:
        (r'^(\d+[A-Z])\s+(.+)$', 'option'),              # 1A, 2B
        (r'^(Module|Topic|Section)\s+(\d+):?\s+(.+)$', 'module')
    ]
    
    def parse_markdown(self, md_content: str, board: str) -> List[Dict]:
        """Extract topics from Firecrawl markdown output."""
        topics = []
        
        for line in md_content.split('\n'):
            heading_match = re.match(r'^(#{2,4})\s+(.+)$', line)
            if not heading_match:
                continue
            
            level = len(heading_match.group(1)) - 1
            content = heading_match.group(2)
            
            for pattern, pattern_type in self.PATTERNS:
                match = re.match(pattern, content)
                if match:
                    code = match.group(1)
                    title = match.group(2) if pattern_type != 'module' else match.group(3)
                    
                    # Check for "(A-level only)" flags
                    flags = []
                    if "(A-level only)" in title.lower():
                        flags.append("A-level only")
                        title = title.replace("(A-level only)", "").strip()
                    
                    topics.append({
                        'code': code,
                        'title': title,
                        'level': level,
                        'pattern_type': pattern_type,
                        'flags': flags
                    })
                    break
        
        return self.build_hierarchy(topics)
    
    def build_hierarchy(self, topics: List[Dict]) -> List[Dict]:
        """Build parent-child relationships."""
        stack = []
        
        for topic in topics:
            # Pop stack until we find a parent with lower level
            while stack and stack[-1]['level'] >= topic['level']:
                stack.pop()
            
            topic['parent_code'] = stack[-1]['code'] if stack else None
            stack.append(topic)
        
        return topics
    
    def validate_board_specific(self, topics: List[Dict], board: str, subject: str) -> bool:
        """Validate topic counts match expected structure."""
        validators = {
            'AQA': {
                'Biology': lambda t: len([x for x in t if x['level'] == 0]) == 7,  # 3.1-3.7
                'Mathematics': lambda t: any(x['code'] in 'ABCDEFGHIJKLMNOPQRS' for x in t),
                'History': lambda t: any(re.match(r'\d+[A-Z]', x['code']) for x in t)
            },
            'OCR': {
                'Biology A': lambda t: len([x for x in t if x['pattern_type'] == 'module']) == 6
            },
            'Edexcel': {
                'Biology B': lambda t: len([x for x in t if 'Topic' in x['code']]) == 10
            }
        }
        
        validator = validators.get(board, {}).get(subject)
        return validator(topics) if validator else True

# Usage
parser = TopicParser()
topics = parser.parse_markdown(firecrawl_markdown_output, board='AQA')
valid = parser.validate_board_specific(topics, 'AQA', 'Biology')
```

---

## 6. DATABASE MIGRATION SCRIPTS

### 6.1 Create All Staging Schemas

```sql
-- staging-schemas.sql
-- Run this once to create all board-specific staging schemas

-- AQA (already exists - see CREATE-AQA-SCHEMA.sql)
-- Just ensure it's up to date

-- OCR Staging Schema
CREATE SCHEMA IF NOT EXISTS staging_ocr;

CREATE TABLE staging_ocr.ocr_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT CHECK (qualification_type IN ('A-Level', 'GCSE')),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_ocr.ocr_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES staging_ocr.ocr_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_ocr.ocr_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (topic_level >= 0 AND topic_level <= 3),
  description TEXT,
  module_number INTEGER,  -- OCR-specific: Modules 1-6
  UNIQUE(subject_id, topic_code)
);

-- Edexcel Staging Schema
CREATE SCHEMA IF NOT EXISTS staging_edexcel;

CREATE TABLE staging_edexcel.edexcel_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,  -- e.g., "9BI0"
  qualification_type TEXT CHECK (qualification_type IN ('A-Level', 'GCSE')),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_edexcel.edexcel_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES staging_edexcel.edexcel_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_edexcel.edexcel_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (topic_level >= 0 AND topic_level <= 3),
  description TEXT,
  topic_number INTEGER,  -- Edexcel: Topics 1-10
  UNIQUE(subject_id, topic_code)
);

-- WJEC/Eduqas Staging Schema
CREATE SCHEMA IF NOT EXISTS staging_wjec;

CREATE TABLE staging_wjec.wjec_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT CHECK (qualification_type IN ('A-Level', 'GCSE')),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_wjec.wjec_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES staging_wjec.wjec_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_wjec.wjec_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (topic_level >= 0 AND topic_level <= 3),
  description TEXT,
  UNIQUE(subject_id, topic_code)
);

-- CCEA Staging Schema
CREATE SCHEMA IF NOT EXISTS staging_ccea;

CREATE TABLE staging_ccea.ccea_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT CHECK (qualification_type IN ('A-Level', 'GCSE')),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_ccea.ccea_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES staging_ccea.ccea_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_ccea.ccea_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (topic_level >= 0 AND topic_level <= 3),
  description TEXT,
  UNIQUE(subject_id, topic_code)
);

-- SQA Staging Schema
CREATE SCHEMA IF NOT EXISTS staging_sqa;

CREATE TABLE staging_sqa.sqa_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  qualification_type TEXT CHECK (qualification_type IN ('Higher', 'National 5', 'Advanced Higher')),
  specification_url TEXT,
  specification_pdf_url TEXT,
  spec_version TEXT,
  spec_pdf_sha256 TEXT,
  last_scraped TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_code, qualification_type)
);

CREATE TABLE staging_sqa.sqa_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES staging_sqa.sqa_subjects(id) ON DELETE CASCADE,
  parent_topic_id UUID REFERENCES staging_sqa.sqa_topics(id) ON DELETE CASCADE,
  topic_code TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  topic_level INTEGER CHECK (topic_level >= 0 AND topic_level <= 3),
  description TEXT,
  UNIQUE(subject_id, topic_code)
);

-- Create indexes for all boards
DO $$
DECLARE
  board TEXT;
BEGIN
  FOR board IN SELECT unnest(ARRAY['aqa', 'ocr', 'edexcel', 'wjec', 'ccea', 'sqa'])
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_topics_subject ON staging_%s.%s_topics(subject_id)', board, board, board);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_topics_parent ON staging_%s.%s_topics(parent_topic_id)', board, board, board);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_topics_level ON staging_%s.%s_topics(topic_level)', board, board, board);
  END LOOP;
END $$;

-- Verification
SELECT 
  schema_name,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE schema_name LIKE 'staging_%'
GROUP BY schema_name
ORDER BY schema_name;
```

### 6.2 Migration Script (Staging → Production)

```sql
-- migrate-board-to-production.sql
-- Template for migrating one board's data to production
-- Usage: Replace {BOARD} with 'AQA', 'OCR', etc.

BEGIN;

-- ================================================================
-- STEP 1: Create Temp Mapping Table
-- ================================================================
CREATE TEMP TABLE topic_id_mapping (
  staging_id UUID,
  production_id UUID,
  topic_level INTEGER
);

-- ================================================================
-- STEP 2: Delete Existing Production Data for This Board
-- ================================================================
DELETE FROM curriculum_topics
WHERE exam_board_subject_id IN (
  SELECT ebs.id 
  FROM exam_board_subjects ebs
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = '{BOARD}'  -- Replace with 'AQA', 'OCR', etc.
);

-- ================================================================
-- STEP 3: Insert Level 0 Topics (Main Units)
-- ================================================================
WITH inserted AS (
  INSERT INTO curriculum_topics (
    exam_board_subject_id,
    parent_topic_id,
    topic_name,
    topic_code,
    topic_level,
    sort_order
  )
  SELECT
    ebs.id,                                    -- Link to exam_board_subjects
    NULL,                                      -- Level 0 has no parent
    st.topic_name,
    st.topic_code,
    1,                                         -- Production level 1 = Staging level 0
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY st.topic_code)
  FROM staging_{BOARD}.{BOARD}_topics st
  JOIN staging_{BOARD}.{BOARD}_subjects ss ON st.subject_id = ss.id
  JOIN exam_board_subjects ebs ON 
    ebs.subject_name = ss.subject_name || ' (' || ss.qualification_type || ')'
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = '{BOARD}'
    AND st.topic_level = 0
    AND st.parent_topic_id IS NULL
  RETURNING id, topic_code, 1 as topic_level
)
INSERT INTO topic_id_mapping (staging_id, production_id, topic_level)
SELECT 
  st.id,
  i.id,
  1
FROM inserted i
JOIN staging_{BOARD}.{BOARD}_topics st ON st.topic_code = i.topic_code;

-- ================================================================
-- STEP 4: Insert Level 1 Topics (Nested under Level 0)
-- ================================================================
WITH inserted AS (
  INSERT INTO curriculum_topics (
    exam_board_subject_id,
    parent_topic_id,
    topic_name,
    topic_code,
    topic_level,
    sort_order
  )
  SELECT
    ebs.id,
    mapping.production_id,                    -- Link to parent
    st.topic_name,
    st.topic_code,
    2,                                         -- Production level 2 = Staging level 1
    ROW_NUMBER() OVER (PARTITION BY mapping.production_id ORDER BY st.topic_code)
  FROM staging_{BOARD}.{BOARD}_topics st
  JOIN staging_{BOARD}.{BOARD}_subjects ss ON st.subject_id = ss.id
  JOIN exam_board_subjects ebs ON 
    ebs.subject_name = ss.subject_name || ' (' || ss.qualification_type || ')'
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  JOIN topic_id_mapping mapping ON mapping.staging_id = st.parent_topic_id
  WHERE eb.code = '{BOARD}'
    AND st.topic_level = 1
  RETURNING id, topic_code, 2 as topic_level
)
INSERT INTO topic_id_mapping (staging_id, production_id, topic_level)
SELECT 
  st.id,
  i.id,
  2
FROM inserted i
JOIN staging_{BOARD}.{BOARD}_topics st ON st.topic_code = i.topic_code;

-- ================================================================
-- STEP 5: Insert Level 2 Topics (Nested under Level 1)
-- ================================================================
WITH inserted AS (
  INSERT INTO curriculum_topics (
    exam_board_subject_id,
    parent_topic_id,
    topic_name,
    topic_code,
    topic_level,
    sort_order
  )
  SELECT
    ebs.id,
    mapping.production_id,
    st.topic_name,
    st.topic_code,
    3,                                         -- Production level 3 = Staging level 2
    ROW_NUMBER() OVER (PARTITION BY mapping.production_id ORDER BY st.topic_code)
  FROM staging_{BOARD}.{BOARD}_topics st
  JOIN staging_{BOARD}.{BOARD}_subjects ss ON st.subject_id = ss.id
  JOIN exam_board_subjects ebs ON 
    ebs.subject_name = ss.subject_name || ' (' || ss.qualification_type || ')'
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  JOIN topic_id_mapping mapping ON mapping.staging_id = st.parent_topic_id
  WHERE eb.code = '{BOARD}'
    AND st.topic_level = 2
  RETURNING id, topic_code, 3 as topic_level
)
INSERT INTO topic_id_mapping (staging_id, production_id, topic_level)
SELECT 
  st.id,
  i.id,
  3
FROM inserted i
JOIN staging_{BOARD}.{BOARD}_topics st ON st.topic_code = i.topic_code;

-- ================================================================
-- STEP 6: Insert Level 3 Topics (Nested under Level 2)
-- ================================================================
INSERT INTO curriculum_topics (
  exam_board_subject_id,
  parent_topic_id,
  topic_name,
  topic_code,
  topic_level,
  sort_order
)
SELECT
  ebs.id,
  mapping.production_id,
  st.topic_name,
  st.topic_code,
  4,                                           -- Production level 4 = Staging level 3
  ROW_NUMBER() OVER (PARTITION BY mapping.production_id ORDER BY st.topic_code)
FROM staging_{BOARD}.{BOARD}_topics st
JOIN staging_{BOARD}.{BOARD}_subjects ss ON st.subject_id = ss.id
JOIN exam_board_subjects ebs ON 
  ebs.subject_name = ss.subject_name || ' (' || ss.qualification_type || ')'
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN topic_id_mapping mapping ON mapping.staging_id = st.parent_topic_id
WHERE eb.code = '{BOARD}'
  AND st.topic_level = 3;

-- ================================================================
-- STEP 7: Validation
-- ================================================================
SELECT 
  '{BOARD} Migration Summary' as status,
  COUNT(*) as total_topics,
  COUNT(DISTINCT exam_board_subject_id) as subjects_affected,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as level_1_count,
  COUNT(CASE WHEN topic_level = 2 THEN 1 END) as level_2_count,
  COUNT(CASE WHEN topic_level = 3 THEN 1 END) as level_3_count,
  COUNT(CASE WHEN topic_level = 4 THEN 1 END) as level_4_count
FROM curriculum_topics
WHERE exam_board_subject_id IN (
  SELECT ebs.id 
  FROM exam_board_subjects ebs
  JOIN exam_boards eb ON ebs.exam_board_id = eb.id
  WHERE eb.code = '{BOARD}'
);

-- If validation looks good:
COMMIT;

-- If validation fails:
-- ROLLBACK;
```

---

## 7. TESTING & VALIDATION CHECKLIST

### 7.1 Per-Board Validation

**After scraping to staging:**
- [ ] All subjects scraped (check count vs official board subject list)
- [ ] Topic counts match spec indices
- [ ] Hierarchy preserved (parent_topic_id correct)
- [ ] No duplicates (UNIQUE constraints enforced)
- [ ] Spec version captured
- [ ] PDF hash stored (for change detection)

**Board-Specific Checks:**

**AQA:**
- [ ] Biology: 7 top-level topics (3.1-3.7)
- [ ] Maths: Sections A-S present
- [ ] History: Option codes 1A-1W present
- [ ] Accounting: ~50-100 topics (not hundreds!)

**OCR:**
- [ ] Biology A: 6 modules (Modules 1-6)
- [ ] Chemistry A: 6 modules
- [ ] Physics A: 6 modules

**Edexcel:**
- [ ] Biology B (9BI0): 10 topics
- [ ] Chemistry (9CH0): Topic structure present
- [ ] Maths (9MA0): Spec PDF parsed correctly

**WJEC:**
- [ ] Biology: PDF parsing successful
- [ ] Chemistry: PDF parsing successful

**CCEA:**
- [ ] Rewardinglearning links followed
- [ ] PDFs downloaded and parsed

### 7.2 App Testing

**After migration to production:**
1. **Onboarding Flow**
   - [ ] Select {BOARD} → See subjects
   - [ ] Select A-Level → See correct subjects
   - [ ] Select subject → TopicEditModal opens
   - [ ] See topics in hierarchy (not flat list)
   - [ ] Topic counts reasonable (~50-150, not hundreds)

2. **Topic Curation**
   - [ ] Can expand/collapse modules
   - [ ] Can add custom topics
   - [ ] Can delete topics
   - [ ] Can reorder topics
   - [ ] Save works correctly

3. **Flashcard Generation**
   - [ ] Select topic → Can create cards
   - [ ] AI generation references correct topic

---

## 8. COST ESTIMATE

### Firecrawl Costs

**Pricing:** ~$0.50 per 1000 credits  
**Usage per board:**
- Discovery (`/map`): ~100 credits
- Crawl (50 subjects × 5 pages each): ~250 credits per subject = 12,500 credits
- Total per board: ~12,600 credits = **~$6.30 per board**

**All 5 boards:** ~$31.50 one-time  
**Bi-annual updates:** ~$63/year

### Development Time

**Per board:**
- Setup Firecrawl config: 2 hours
- Scrape + validate: 4 hours
- Migrate to production: 2 hours
- Testing: 2 hours
- **Total: ~10 hours per board**

**All boards:** ~50 hours (~1.5 weeks full-time)

### Alternative (Current Approach - Free but Manual)

**Current approach cost:**
- Scraping: FREE (BeautifulSoup)
- Manual cleanup: ~20 hours per board
- Bug fixing duplicates: Ongoing

**Conclusion:** Firecrawl is worth it for consistency and automation.

---

## 9. ROLLOUT TIMELINE

### Recommended Schedule (12 weeks)

**Week 1:** Infrastructure
- Create all staging schemas
- Set up Firecrawl
- Build parser library
- Test with 1 subject

**Weeks 2-3:** AQA Complete
- Scrape all 68 A-level subjects
- Validate in staging
- Fix any parser issues

**Week 4:** AQA Production
- Migrate AQA to production
- App testing
- Fix any app issues

**Weeks 5-6:** OCR
**Weeks 7-8:** Edexcel
**Weeks 9-10:** WJEC + CCEA
**Weeks 11-12:** SQA + Buffer

**Total:** 12 weeks to complete all boards

---

## 10. MAINTENANCE PLAN

### Bi-Annual Updates (June & December)

**Trigger:** Exam boards typically update specs annually (Sept) or mid-year

**Process:**
1. **Run Firecrawl Scraper**
   - Re-crawl all boards
   - Compare spec_pdf_sha256 hashes
   - Identify changed subjects

2. **Review Changes**
   - For changed subjects: Compare old vs new topics
   - Flag breaking changes (removed topics = user impact)

3. **Staged Rollout**
   - Update staging database
   - Validate changes
   - Notify users of major changes
   - Migrate to production

4. **User Impact Analysis**
   - Check if any user_topics references will break
   - Remap deleted topics to closest equivalent
   - Notify users via email if their topics changed

**Automation Potential:**
- GitHub Actions cron job (monthly)
- Automatically scrape → compare hashes → email report
- Manual review → approval → production deploy

---

## 11. NEXT STEPS (Immediate)

### This Week:
1. ✅ **Review this document** - Confirm strategy makes sense
2. ✅ **Set up Firecrawl account** - Get API key
3. ✅ **Create staging schemas** - Run `staging-schemas.sql`
4. ✅ **Test Firecrawl with 1 subject** - AQA Biology as proof-of-concept

### Next Week:
5. **Build parser library** - Node + Python versions
6. **Scrape 5 AQA subjects** - Biology, Chemistry, Physics, Maths, History
7. **Validate in app** - Ensure data quality is good

### Decision Point:
If Week 2 successful → Proceed with full rollout  
If issues found → Iterate on parser/approach

---

## 12. APPENDIX: USEFUL QUERIES

### Check Current Production Data Quality

```sql
-- Find subjects with excessive topic counts (likely duplicates)
SELECT 
  eb.code as exam_board,
  qt.code as qualification_type,
  ebs.subject_name,
  COUNT(ct.id) as topic_count,
  CASE 
    WHEN COUNT(ct.id) > 200 THEN '🚨 EXCESSIVE'
    WHEN COUNT(ct.id) > 100 THEN '⚠️ HIGH'
    WHEN COUNT(ct.id) < 10 THEN '⚠️ TOO FEW'
    ELSE '✅ OK'
  END as status
FROM exam_board_subjects ebs
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LEFT JOIN curriculum_topics ct ON ct.exam_board_subject_id = ebs.id
GROUP BY eb.code, qt.code, ebs.subject_name, ebs.id
HAVING COUNT(ct.id) > 200 OR COUNT(ct.id) < 10
ORDER BY COUNT(ct.id) DESC;
```

### Find Duplicate Topics in Same Subject

```sql
-- Detect duplicate topic names within same subject
SELECT 
  ebs.subject_name,
  ct.topic_name,
  ct.topic_level,
  COUNT(*) as duplicate_count
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
GROUP BY ebs.subject_name, ct.topic_name, ct.topic_level
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, ebs.subject_name;
```

### Staging vs Production Comparison

```sql
-- Compare staging vs production for one subject
SELECT 
  'Staging' as source,
  COUNT(*) as total_topics,
  COUNT(CASE WHEN topic_level = 0 THEN 1 END) as level_0,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as level_1,
  COUNT(CASE WHEN topic_level = 2 THEN 1 END) as level_2,
  COUNT(CASE WHEN topic_level = 3 THEN 1 END) as level_3
FROM staging_aqa.aqa_topics
WHERE subject_id = (SELECT id FROM staging_aqa.aqa_subjects WHERE subject_code = '7402')

UNION ALL

SELECT 
  'Production' as source,
  COUNT(*) as total_topics,
  COUNT(CASE WHEN topic_level = 1 THEN 1 END) as level_0,
  COUNT(CASE WHEN topic_level = 2 THEN 1 END) as level_1,
  COUNT(CASE WHEN topic_level = 3 THEN 1 END) as level_2,
  COUNT(CASE WHEN topic_level = 4 THEN 1 END) as level_3
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
WHERE eb.code = 'AQA' AND ebs.subject_name = 'Biology (A-Level)';
```

---

## SUMMARY

**Problem:** Duplicate/inconsistent topic data; no version tracking; manual cleanup burden

**Solution:** 
1. Staging databases per board
2. Firecrawl for automated, consistent scraping
3. Deterministic parsing (no AI hallucinations)
4. Atomic migrations (delete old → insert new)
5. Bi-annual update process

**Benefits:**
- ✅ Clean, accurate topic lists
- ✅ Exam papers/mark schemes integration ready
- ✅ Version tracking for change detection
- ✅ Repeatable, maintainable process
- ✅ No user impact during updates

**Costs:**
- ~$63/year for Firecrawl (bi-annual updates)
- ~50 hours initial setup (all 5 boards)
- ~8 hours bi-annual maintenance

**ROI:** Eliminates ongoing manual cleanup; enables exam papers feature; improves user experience

---

**Recommended Next Step:** Test Firecrawl with AQA Biology this week. If successful, proceed with full AQA rollout.

