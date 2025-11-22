# Week 1-2 Technical Spec: AI Topic Search Foundation (CORRECTED)

## Overview
Build the foundation for semantic topic search using Supabase + pgvector, with pre-generated AI metadata.

**Important:** This spec incorporates Supabase-specific patterns and is designed for **incremental updates** - you can start with 70% of topics and add more later.

**Stack:**
- Supabase Postgres + pgvector
- OpenAI embeddings (text-embedding-3-small)
- OpenAI GPT-4o-mini for summaries
- Node.js batch scripts

---

## Week 1: Database Schema + Batch Generation

### Day 1: Set Up pgvector Extension

#### 1. Enable pgvector in Supabase

Run in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify it worked
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### 2. Create topic_ai_metadata Table

```sql
-- AI-enhanced metadata for every topic
CREATE TABLE topic_ai_metadata (
  -- Primary key references existing curriculum_topics
  topic_id UUID PRIMARY KEY REFERENCES curriculum_topics(id) ON DELETE CASCADE,
  
  -- Vector embedding for semantic search (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,
  
  -- Pre-generated AI content
  plain_english_summary TEXT NOT NULL,
  difficulty_band TEXT CHECK (difficulty_band IN ('core', 'standard', 'challenge')),
  exam_importance FLOAT CHECK (exam_importance BETWEEN 0 AND 1),
  
  -- Topic context for better search (denormalized for speed)
  subject_name TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  qualification_level TEXT NOT NULL,
  topic_level INTEGER,
  full_path TEXT[], -- Breadcrumb array: ['Cells', 'Membranes', 'Osmosis']
  
  -- Lifecycle tracking (for incremental updates)
  is_active BOOLEAN DEFAULT true,
  spec_version TEXT DEFAULT 'v1',
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity index
-- Try HNSW first (faster), fallback to IVFFlat if not available
CREATE INDEX topic_embedding_hnsw_idx ON topic_ai_metadata 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- If HNSW fails, use this instead:
-- CREATE INDEX topic_embedding_ivf_idx ON topic_ai_metadata 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Create indexes for filtering before vector search
CREATE INDEX topic_metadata_subject_idx ON topic_ai_metadata(subject_name);
CREATE INDEX topic_metadata_board_idx ON topic_ai_metadata(exam_board);
CREATE INDEX topic_metadata_level_idx ON topic_ai_metadata(qualification_level);
CREATE INDEX topic_metadata_importance_idx ON topic_ai_metadata(exam_importance DESC);
CREATE INDEX topic_metadata_active_idx ON topic_ai_metadata(is_active) WHERE is_active = true;

-- Composite index for common filter combinations
CREATE INDEX topic_metadata_course_idx ON topic_ai_metadata(
  exam_board, qualification_level, subject_name
) WHERE is_active = true;
```

#### 3. Create Helper View for Denormalized Data

```sql
-- View that joins topics with their context for batch processing
CREATE OR REPLACE VIEW topics_with_context AS
SELECT 
  ct.id as topic_id,
  ct.topic_name,
  ct.topic_code,
  ct.topic_level,
  ct.sort_order,
  
  ebs.subject_name,
  ebs.subject_code,
  eb.code as exam_board,
  qt.code as qualification_level,
  
  -- Build hierarchical path (up to 4 levels)
  ARRAY_REMOVE(ARRAY[
    parent3.topic_name,
    parent2.topic_name,
    parent1.topic_name,
    ct.topic_name
  ], NULL) as full_path,
  
  -- Get all parent context for better embeddings
  COALESCE(parent1.topic_name, '') as parent_1_name,
  COALESCE(parent2.topic_name, '') as parent_2_name,
  COALESCE(parent3.topic_name, '') as parent_3_name
  
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id

-- Join parents for hierarchical context
LEFT JOIN curriculum_topics parent1 ON ct.parent_topic_id = parent1.id
LEFT JOIN curriculum_topics parent2 ON parent1.parent_topic_id = parent2.id
LEFT JOIN curriculum_topics parent3 ON parent2.parent_topic_id = parent3.id

WHERE ebs.is_current = true;
```

#### 4. Create Vector Search RPC Function (CRITICAL FIX)

```sql
-- RPC function for vector similarity search with course filtering
-- This is the Supabase-compatible way to do vector search
CREATE OR REPLACE FUNCTION match_topics(
  query_embedding vector(1536),
  p_exam_board text DEFAULT NULL,
  p_qualification_level text DEFAULT NULL,
  p_subject_name text DEFAULT NULL,
  p_match_threshold float DEFAULT 0.8,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  topic_id uuid,
  plain_english_summary text,
  difficulty_band text,
  exam_importance float,
  subject_name text,
  exam_board text,
  qualification_level text,
  topic_level int,
  full_path text[],
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    tam.topic_id,
    tam.plain_english_summary,
    tam.difficulty_band,
    tam.exam_importance,
    tam.subject_name,
    tam.exam_board,
    tam.qualification_level,
    tam.topic_level,
    tam.full_path,
    1 - (tam.embedding <=> query_embedding) as similarity
  FROM topic_ai_metadata tam
  WHERE
    tam.is_active = true
    AND (p_exam_board IS NULL OR tam.exam_board = p_exam_board)
    AND (p_qualification_level IS NULL OR tam.qualification_level = p_qualification_level)
    AND (p_subject_name IS NULL OR tam.subject_name = p_subject_name)
    AND (1 - (tam.embedding <=> query_embedding)) >= p_match_threshold
  ORDER BY tam.embedding <=> query_embedding
  LIMIT p_limit;
$$;

-- Test it
SELECT * FROM match_topics(
  (SELECT embedding FROM topic_ai_metadata LIMIT 1), -- test embedding
  'AQA',
  'A_LEVEL',
  'Biology',
  0.0, -- no threshold for testing
  5
);
```

---

### Day 2-5: Build Batch Generation Script (WITH INCREMENTAL SUPPORT)

#### lib/supabase-client.js (CORRECTED)

```javascript
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

/**
 * Fetch all topics with their context - HANDLES LARGE DATASETS
 * Uses pagination to avoid Supabase row limits
 */
export async function fetchTopicsWithContext(onlyMissing = true) {
  const allTopics = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  console.log(`📥 Fetching topics (onlyMissing: ${onlyMissing})...`);
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    let query = supabase
      .from('topics_with_context')
      .select('*')
      .range(from, to)
      .order('topic_id');
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allTopics.push(...data);
      console.log(`  Fetched ${allTopics.length} topics...`);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  // If onlyMissing, filter to topics without metadata
  if (onlyMissing) {
    const existingIds = await getExistingMetadataIds();
    const filtered = allTopics.filter(t => !existingIds.has(t.topic_id));
    console.log(`  Filtered to ${filtered.length} topics needing metadata`);
    return filtered;
  }
  
  return allTopics;
}

/**
 * Check which topics already have metadata
 */
export async function getExistingMetadataIds() {
  const ids = new Set();
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await supabase
      .from('topic_ai_metadata')
      .select('topic_id')
      .range(from, to);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(d => ids.add(d.topic_id));
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return ids;
}

/**
 * Upsert topic metadata in batches
 */
export async function upsertTopicMetadata(metadataArray) {
  const { error } = await supabase
    .from('topic_ai_metadata')
    .upsert(metadataArray, { onConflict: 'topic_id' });
  
  if (error) throw error;
}
```

#### generate-topic-metadata.js (IMPROVED - processes in windows)

```javascript
import cliProgress from 'cli-progress';
import { 
  fetchTopicsWithContext, 
  upsertTopicMetadata 
} from './lib/supabase-client.js';
import { generateAllEmbeddings } from './lib/embedding-generator.js';
import { generateAllSummaries } from './lib/summary-generator.js';
import { config } from './config.js';

// Progress bars
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: '{task} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s'
}, cliProgress.Presets.shades_classic);

async function main() {
  console.log('🚀 Starting INCREMENTAL topic metadata generation...\n');
  
  // Step 1: Fetch only topics that need processing
  console.log('📥 Fetching topics needing metadata...');
  const topicsToProcess = await fetchTopicsWithContext(true); // true = only missing
  
  if (topicsToProcess.length === 0) {
    console.log('✅ All topics already have metadata. Nothing to do!');
    return;
  }
  
  console.log(`📝 Found ${topicsToProcess.length} topics to process`);
  console.log(`   ${new Set(topicsToProcess.map(t => t.exam_board)).size} exam boards`);
  console.log(`   ${new Set(topicsToProcess.map(t => t.subject_name)).size} subjects\n`);
  
  // Ask for confirmation if processing a lot
  if (topicsToProcess.length > 1000) {
    console.log(`⚠️  This will process ${topicsToProcess.length} topics`);
    console.log(`   Estimated cost: ~$${((topicsToProcess.length / 1000) * 0.031).toFixed(2)}`);
    console.log(`   Estimated time: ~${Math.ceil(topicsToProcess.length / 500)} minutes\n`);
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Process in windows to avoid memory issues
  const WINDOW_SIZE = 2000;
  let totalEmbeddings = [];
  let totalSummaries = [];
  
  for (let windowStart = 0; windowStart < topicsToProcess.length; windowStart += WINDOW_SIZE) {
    const window = topicsToProcess.slice(windowStart, windowStart + WINDOW_SIZE);
    const windowEnd = Math.min(windowStart + WINDOW_SIZE, topicsToProcess.length);
    
    console.log(`\n📦 Processing window: ${windowStart + 1}-${windowEnd}/${topicsToProcess.length}`);
    
    // Step 2: Generate embeddings for this window
    console.log('🧠 Generating embeddings...');
    const embeddingBar = multibar.create(window.length, 0, { 
      task: `Embed ${windowStart}-${windowEnd}` 
    });
    
    const embeddings = await generateAllEmbeddings(
      window,
      (current, total) => embeddingBar.update(current)
    );
    
    embeddingBar.stop();
    totalEmbeddings.push(...embeddings);
    
    // Step 3: Generate AI summaries for this window
    console.log('📝 Generating AI summaries...');
    const summaryBar = multibar.create(window.length, 0, { 
      task: `Summary ${windowStart}-${windowEnd}` 
    });
    
    const summaries = await generateAllSummaries(
      window,
      (current, total) => summaryBar.update(current)
    );
    
    summaryBar.stop();
    totalSummaries.push(...summaries);
    
    // Step 4: Save this window to database
    console.log('💾 Saving window to database...');
    
    const metadata = embeddings.map((emb, idx) => {
      const summary = summaries[idx];
      return {
        topic_id: emb.topic_id,
        embedding: JSON.stringify(emb.embedding), // Supabase expects JSON string
        plain_english_summary: summary.summary,
        difficulty_band: summary.difficulty_band,
        exam_importance: summary.exam_importance,
        subject_name: emb.subject_name,
        exam_board: emb.exam_board,
        qualification_level: emb.qualification_level,
        topic_level: emb.topic_level,
        full_path: emb.full_path,
        is_active: true,
        spec_version: 'v1',
      };
    });
    
    // Upsert in smaller batches (Supabase limit ~1000)
    const upsertBatchSize = 500;
    for (let i = 0; i < metadata.length; i += upsertBatchSize) {
      const batch = metadata.slice(i, i + upsertBatchSize);
      await upsertTopicMetadata(batch);
    }
    
    console.log(`✅ Saved window ${windowStart}-${windowEnd}`);
  }
  
  console.log(`\n✅ ALL DONE! Generated metadata for ${topicsToProcess.length} topics\n`);
  
  // Cost estimate
  const embeddingTokens = topicsToProcess.length * 50;
  const summaryTokens = topicsToProcess.length * 200;
  
  const embeddingCost = (embeddingTokens / 1_000_000) * 0.02;
  const summaryCost = (summaryTokens / 1_000_000) * 0.15;
  const totalCost = embeddingCost + summaryCost;
  
  console.log('💰 Actual costs:');
  console.log(`  Embeddings: $${embeddingCost.toFixed(4)}`);
  console.log(`  Summaries:  $${summaryCost.toFixed(4)}`);
  console.log(`  Total:      $${totalCost.toFixed(4)}\n`);
  
  multibar.stop();
}

main().catch(console.error);
```

---

## Week 2: Search API with RPC

### Day 8-10: Build Search API (CORRECTED FOR SUPABASE)

#### api/topics/search-topics.js

```javascript
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for user's search query
 */
async function generateQueryEmbedding(searchText) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: searchText,
  });
  
  return response.data[0].embedding;
}

/**
 * Vector search using Supabase RPC function
 */
async function vectorSearchTopics(embedding, courseFilters, limit = 20) {
  const { examBoard, qualificationLevel, subjectName } = courseFilters;
  
  // Call the RPC function we created in database
  const { data, error } = await supabase.rpc('match_topics', {
    query_embedding: embedding,
    p_exam_board: examBoard || null,
    p_qualification_level: qualificationLevel || null,
    p_subject_name: subjectName || null,
    p_match_threshold: 0.0, // No threshold, let client decide
    p_limit: limit,
  });
  
  if (error) throw error;
  
  // Convert similarity (0-1) to confidence (0-100%)
  return data.map(topic => ({
    ...topic,
    confidence: Math.round(topic.similarity * 100),
  }));
}

/**
 * Main search handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { searchQuery, courseFilters } = req.body;
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    
    console.log(`🔍 Searching for: "${searchQuery}"`, courseFilters);
    
    // Step 1: Generate embedding for search query
    const queryEmbedding = await generateQueryEmbedding(searchQuery);
    
    // Step 2: Vector search with course filters (using RPC)
    const topicCandidates = await vectorSearchTopics(
      queryEmbedding,
      courseFilters || {},
      20
    );
    
    // Step 3: Group by confidence
    const exactMatches = topicCandidates.filter(t => t.confidence >= 70);
    const relatedMatches = topicCandidates.filter(t => t.confidence < 70 && t.confidence >= 40);
    
    console.log(`  Found ${exactMatches.length} exact, ${relatedMatches.length} related`);
    
    return res.status(200).json({
      success: true,
      query: searchQuery,
      results: {
        exact: exactMatches,
        related: relatedMatches,
      },
      meta: {
        total_candidates: topicCandidates.length,
        exact_count: exactMatches.length,
        related_count: relatedMatches.length,
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ 
      error: 'Search failed',
      message: error.message 
    });
  }
}
```

---

## Pilot Test Strategy

### Run on Small Subset First (200 topics)

```javascript
// In generate-topic-metadata.js, add a pilot mode:
const PILOT_MODE = process.argv.includes('--pilot');

if (PILOT_MODE) {
  console.log('🧪 PILOT MODE: Processing only 200 topics\n');
  topicsToProcess = topicsToProcess
    .filter(t => t.exam_board === 'AQA' && t.subject_name === 'Biology')
    .slice(0, 200);
}
```

Run pilot:
```bash
npm run generate -- --pilot
```

**Verify:**
- Embeddings are valid 1536-dimension vectors
- Summaries are sensible and plain-English
- Difficulty distribution looks reasonable (not all 'standard')
- Importance scores vary (not all 0.5)

**Expected output:**
```
✅ Pilot complete!
  Embeddings: 200/200
  Summaries: 200/200
  Cost: ~$0.006
  Time: ~5 minutes
```

---

## Data Lifecycle Documentation

Create: `docs/TOPIC-DATA-LIFECYCLE.md`

```markdown
# Topic Data Lifecycle

## Topic States

```
SCRAPED → EMBEDDED → SUMMARIZED → LIVE → DEPRECATED
```

### 1. SCRAPED
- Topics exist in `curriculum_topics` from scraper pipeline
- Have: topic_name, topic_code, hierarchical relationships
- Missing: AI metadata (embeddings, summaries)

### 2. EMBEDDED  
- Topic added to `topic_ai_metadata`
- Vector embedding generated
- Searchable but no AI summary yet

### 3. SUMMARIZED
- Full metadata generated:
  - plain_english_summary
  - difficulty_band
  - exam_importance
- `is_active = true`
- Ready for users

### 4. LIVE
- Students can find it via search
- Students can create cards from it
- Appears in browse/hierarchy views
- Tracked in `user_topics` when selected

### 5. DEPRECATED
- Spec version updated
- `is_active = false` in metadata
- Old students still see it (their history)
- New students don't see it in selection

## Pipeline Operations

### Initial Setup (One-Time)
```bash
# Generate metadata for all existing topics
npm run generate
```

### Add New Exam Board (Incremental)
```bash
# 1. Run scraper for new board
python scrapers/new-board/scrape-subjects.py

# 2. Migrate to production
-- Run: migrate-all-staging-to-production-FIXED.sql

# 3. Generate metadata for new topics only
npm run generate  # Automatically detects & processes new topics
```

### Update Existing Spec (Versioning)
```sql
-- 1. Mark old topics as deprecated
UPDATE topic_ai_metadata
SET is_active = false, spec_version = 'v1_deprecated'
WHERE exam_board = 'AQA'
  AND qualification_level = 'A_LEVEL'
  AND subject_name = 'Biology'
  AND spec_version = 'v1';

-- 2. Scrape new spec → creates new topics with different IDs

-- 3. Run metadata generation → processes new topics
```

### Re-generate Summaries (Prompt Improvements)
```bash
# If you improve your summary prompt:
# 1. Delete existing summaries for a subject
DELETE FROM topic_ai_metadata
WHERE subject_name = 'Biology' AND exam_board = 'AQA';

# 2. Re-run generation
npm run generate
```

## Monitoring

### Check coverage:
```sql
SELECT 
  'Coverage' as metric,
  COUNT(DISTINCT ct.id) as total_topics,
  COUNT(DISTINCT tam.topic_id) as topics_with_metadata,
  ROUND(COUNT(DISTINCT tam.topic_id)::numeric / COUNT(DISTINCT ct.id) * 100, 1) as coverage_pct
FROM curriculum_topics ct
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id
WHERE EXISTS (
  SELECT 1 FROM exam_board_subjects ebs 
  WHERE ebs.id = ct.exam_board_subject_id 
  AND ebs.is_current = true
);
```

### Check metadata quality:
```sql
SELECT 
  exam_board,
  qualification_level,
  COUNT(*) as topics,
  COUNT(*) FILTER (WHERE difficulty_band = 'core') as core_topics,
  COUNT(*) FILTER (WHERE difficulty_band = 'standard') as standard_topics,
  COUNT(*) FILTER (WHERE difficulty_band = 'challenge') as challenge_topics,
  ROUND(AVG(exam_importance), 2) as avg_importance
FROM topic_ai_metadata
WHERE is_active = true
GROUP BY exam_board, qualification_level
ORDER BY exam_board, qualification_level;
```
```

---

## Summary: Green Light with Corrections

**My verdict: PROCEED with these changes:**

### ✅ **Keep From Original Plan:**
- Overall architecture (pgvector + batch generation)
- Cost estimates
- Timeline (Weeks 1-2)
- Feature scope

### 🔧 **Make These Corrections:**
1. **Use RPC function** for vector search (not raw SQL in .select())
2. **Paginate** when fetching 54k topics (avoid row limits)
3. **Process in windows** (2000 topics at a time) to manage memory
4. **Add lifecycle columns** (is_active, spec_version)
5. **Make script incremental** (only process topics without metadata)
6. **Run pilot first** (200 topics) before full batch

### 🚀 **Ship Strategy:**
1. **This week:** Run batch on your 70% (AQA, Edexcel, OCR only)
2. **Launch Feb 1st** with major boards working perfectly
3. **March:** Add remaining boards incrementally
4. **Ongoing:** Monthly updates as specs change

---

## 🎯 Ready to Implement?

I can help you:
1. **Create the corrected schema SQL** (ready to paste into Supabase)
2. **Build the batch scripts** (with all corrections)
3. **Set up the RPC functions**
4. **Run the pilot test** (200 topics to validate)

Want me to create all the files now so you can start Week 1 Monday? 🚀
