# Week 1-2 Technical Spec: AI Topic Search Foundation

## Overview
Build the foundation for semantic topic search using Supabase + pgvector, with pre-generated AI metadata for all 54,942 topics.

**Stack:**
- Supabase Postgres + pgvector
- OpenAI embeddings (text-embedding-3-small)
- OpenAI GPT-4 for summaries/difficulty
- Node.js batch scripts

**Timeline:** 2 weeks

---

## Week 1: Database Schema + Batch Generation

### Day 1-2: Set Up pgvector Extension

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
  embedding vector(1536),
  
  -- Pre-generated AI content
  plain_english_summary TEXT NOT NULL,
  difficulty_band TEXT CHECK (difficulty_band IN ('core', 'standard', 'challenge')),
  exam_importance FLOAT CHECK (exam_importance BETWEEN 0 AND 1),
  
  -- Topic context for better search (denormalized for speed)
  subject_name TEXT,
  exam_board TEXT,
  qualification_level TEXT,
  topic_level INTEGER,
  full_path TEXT[], -- Breadcrumb array: ['Cells', 'Membranes', 'Osmosis']
  
  -- Metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Make embedding searchable
  CONSTRAINT valid_embedding CHECK (array_length(embedding::real[], 1) = 1536)
);

-- Create index for vector similarity search (HNSW is fastest)
CREATE INDEX topic_embedding_idx ON topic_ai_metadata 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create indexes for filtering before vector search
CREATE INDEX topic_metadata_subject_idx ON topic_ai_metadata(subject_name);
CREATE INDEX topic_metadata_board_idx ON topic_ai_metadata(exam_board);
CREATE INDEX topic_metadata_level_idx ON topic_ai_metadata(qualification_level);
CREATE INDEX topic_metadata_importance_idx ON topic_ai_metadata(exam_importance DESC);

-- Composite index for common filter combinations
CREATE INDEX topic_metadata_course_idx ON topic_ai_metadata(
  exam_board, qualification_level, subject_name
);
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
  
  -- Build hierarchical path
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

---

### Day 3-5: Build Batch Generation Script

#### File Structure
```
/scripts/topic-ai-generation/
├── generate-topic-metadata.js      # Main orchestrator
├── lib/
│   ├── openai-client.js           # OpenAI API wrapper
│   ├── supabase-client.js         # Supabase connection
│   ├── embedding-generator.js     # Batch embedding logic
│   ├── summary-generator.js       # AI summary generation
│   └── batch-processor.js         # Chunking & rate limiting
├── prompts/
│   ├── topic-summary-prompt.js    # System prompt for summaries
│   └── topic-difficulty-prompt.js # System prompt for difficulty
├── config.js                      # API keys, batch sizes
└── package.json
```

#### package.json

```json
{
  "name": "topic-ai-generation",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.20.0",
    "dotenv": "^16.3.1",
    "p-limit": "^5.0.0",
    "cli-progress": "^3.12.0"
  },
  "scripts": {
    "generate": "node generate-topic-metadata.js"
  }
}
```

#### config.js

```javascript
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: 'text-embedding-3-small', // $0.02 per 1M tokens
    completionModel: 'gpt-4o-mini',           // $0.15 per 1M input tokens
  },
  batch: {
    embeddingBatchSize: 100,  // OpenAI allows up to 2048 per request
    summaryBatchSize: 10,     // Process 10 summaries in parallel
    maxConcurrency: 5,        // Parallel API calls
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
  costs: {
    // Rough estimates for 54,942 topics
    embeddingCostPer1k: 0.00002,  // $0.02 per 1M tokens / 1000
    summaryCostPer1k: 0.00015,    // $0.15 per 1M input tokens / 1000
  }
};
```

#### lib/supabase-client.js

```javascript
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

/**
 * Fetch all topics with their context
 */
export async function fetchTopicsWithContext() {
  const { data, error } = await supabase
    .from('topics_with_context')
    .select('*')
    .order('topic_id');
  
  if (error) throw error;
  return data;
}

/**
 * Check which topics already have metadata
 */
export async function getExistingMetadataIds() {
  const { data, error } = await supabase
    .from('topic_ai_metadata')
    .select('topic_id');
  
  if (error) throw error;
  return new Set(data.map(d => d.topic_id));
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

#### lib/openai-client.js

```javascript
import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate embeddings for multiple texts in one API call
 */
export async function generateEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts,
    encoding_format: 'float',
  });
  
  return response.data.map(d => d.embedding);
}

/**
 * Generate AI summary and difficulty for a single topic
 */
export async function generateTopicSummary(topic, systemPrompt) {
  const completion = await openai.chat.completions.create({
    model: config.openai.completionModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(topic) }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3, // Lower = more consistent
  });
  
  return JSON.parse(completion.choices[0].message.content);
}
```

#### lib/embedding-generator.js

```javascript
import { generateEmbeddings } from './openai-client.js';
import { config } from '../config.js';
import pLimit from 'p-limit';

/**
 * Build searchable text for embedding from topic context
 */
function buildEmbeddingText(topic) {
  const parts = [
    // Primary identifiers
    `${topic.qualification_level} ${topic.subject_name}`,
    topic.exam_board,
    
    // Hierarchical path (helps with context)
    topic.full_path.join(' → '),
    
    // The topic itself
    topic.topic_name,
    
    // Code for exact matches
    topic.topic_code,
  ];
  
  return parts.filter(Boolean).join(' | ');
}

/**
 * Generate embeddings for all topics in batches
 */
export async function generateAllEmbeddings(topics, progressCallback) {
  const batchSize = config.batch.embeddingBatchSize;
  const limit = pLimit(config.batch.maxConcurrency);
  const results = [];
  
  // Split into batches
  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);
    const texts = batch.map(buildEmbeddingText);
    
    // Generate embeddings for this batch
    const promise = limit(async () => {
      try {
        const embeddings = await generateEmbeddings(texts);
        
        const batchResults = batch.map((topic, idx) => ({
          topic_id: topic.topic_id,
          embedding: embeddings[idx],
          subject_name: topic.subject_name,
          exam_board: topic.exam_board,
          qualification_level: topic.qualification_level,
          topic_level: topic.topic_level,
          full_path: topic.full_path,
        }));
        
        if (progressCallback) {
          progressCallback(i + batch.length, topics.length, 'embeddings');
        }
        
        return batchResults;
      } catch (error) {
        console.error(`Failed batch ${i}-${i + batch.length}:`, error.message);
        throw error;
      }
    });
    
    results.push(promise);
  }
  
  const batches = await Promise.all(results);
  return batches.flat();
}
```

#### prompts/topic-summary-prompt.js

```javascript
export const TOPIC_SUMMARY_SYSTEM_PROMPT = `You write very short, clear explanations of syllabus topics for UK GCSE and A-Level students.

You are given:
- A course (qualification level, exam board, subject).
- A single topic with its title, code, hierarchical path, and level.

You must:
1. Write a 1–2 sentence PLAIN-ENGLISH summary describing:
   - What this topic is about.
   - Why it matters for the exam (connection to other topics or exam focus).
   
2. Estimate a difficulty band for a typical student at this level:
   - "core" (foundational topic everyone must know)
   - "standard" (normal expected level)
   - "challenge" (more complex, often for higher marks)
   
3. Estimate exam_importance (0.0 to 1.0) based on:
   - How fundamental the topic is
   - How often it appears in past papers (if you know)
   - Whether it's a prerequisite for other topics
   
Guidelines:
- GCSE summaries: Use simpler language, concrete examples
- A-Level summaries: More technical vocabulary, deeper connections
- Avoid jargon unless it's exam-critical terminology
- Keep it friendly and encouraging

Return JSON:
{
  "topic_id": "string",
  "summary": "1–2 sentences in plain English",
  "difficulty_band": "core|standard|challenge",
  "exam_importance": 0.0-1.0,
  "reasoning": "brief explanation of your difficulty/importance choices"
}

Only output valid JSON. No extra text.`;
```

#### lib/summary-generator.js

```javascript
import { generateTopicSummary } from './openai-client.js';
import { TOPIC_SUMMARY_SYSTEM_PROMPT } from '../prompts/topic-summary-prompt.js';
import { config } from '../config.js';
import pLimit from 'p-limit';

/**
 * Generate AI summary for a single topic
 */
async function generateSingleSummary(topic) {
  const topicData = {
    course: {
      level: topic.qualification_level,
      board: topic.exam_board,
      subject: topic.subject_name,
    },
    topic: {
      id: topic.topic_id,
      title: topic.topic_name,
      code: topic.topic_code,
      level: topic.topic_level,
      path: topic.full_path,
    }
  };
  
  try {
    const result = await generateTopicSummary(topicData, TOPIC_SUMMARY_SYSTEM_PROMPT);
    return result;
  } catch (error) {
    console.error(`Failed to generate summary for ${topic.topic_name}:`, error.message);
    // Return fallback
    return {
      topic_id: topic.topic_id,
      summary: `Study topic: ${topic.topic_name}`,
      difficulty_band: 'standard',
      exam_importance: 0.5,
      reasoning: 'Fallback due to API error'
    };
  }
}

/**
 * Generate summaries for all topics with rate limiting
 */
export async function generateAllSummaries(topics, progressCallback) {
  const limit = pLimit(config.batch.maxConcurrency);
  const results = [];
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    const promise = limit(async () => {
      const summary = await generateSingleSummary(topic);
      
      if (progressCallback) {
        progressCallback(i + 1, topics.length, 'summaries');
      }
      
      return summary;
    });
    
    results.push(promise);
  }
  
  return await Promise.all(results);
}
```

#### generate-topic-metadata.js (Main Script)

```javascript
import cliProgress from 'cli-progress';
import { 
  fetchTopicsWithContext, 
  getExistingMetadataIds,
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
  console.log('🚀 Starting topic metadata generation...\n');
  
  // Step 1: Fetch all topics
  console.log('📥 Fetching topics from database...');
  const allTopics = await fetchTopicsWithContext();
  console.log(`Found ${allTopics.length} topics\n`);
  
  // Step 2: Check what's already done
  console.log('🔍 Checking for existing metadata...');
  const existingIds = await getExistingMetadataIds();
  console.log(`${existingIds.size} topics already have metadata\n`);
  
  // Filter to only topics that need processing
  const topicsToProcess = allTopics.filter(t => !existingIds.has(t.topic_id));
  
  if (topicsToProcess.length === 0) {
    console.log('✅ All topics already have metadata. Nothing to do!');
    return;
  }
  
  console.log(`📝 Processing ${topicsToProcess.length} topics...\n`);
  
  // Step 3: Generate embeddings
  console.log('🧠 Generating embeddings...');
  const embeddingBar = multibar.create(topicsToProcess.length, 0, { task: 'Embeddings  ' });
  
  const embeddings = await generateAllEmbeddings(
    topicsToProcess,
    (current, total) => embeddingBar.update(current)
  );
  
  embeddingBar.stop();
  console.log(`✅ Generated ${embeddings.length} embeddings\n`);
  
  // Step 4: Generate AI summaries & difficulty
  console.log('📝 Generating AI summaries & difficulty ratings...');
  const summaryBar = multibar.create(topicsToProcess.length, 0, { task: 'Summaries   ' });
  
  const summaries = await generateAllSummaries(
    topicsToProcess,
    (current, total) => summaryBar.update(current)
  );
  
  summaryBar.stop();
  console.log(`✅ Generated ${summaries.length} summaries\n`);
  
  // Step 5: Merge data and upsert
  console.log('💾 Saving to database...');
  
  const metadata = embeddings.map((emb, idx) => {
    const summary = summaries[idx];
    return {
      topic_id: emb.topic_id,
      embedding: emb.embedding,
      plain_english_summary: summary.summary,
      difficulty_band: summary.difficulty_band,
      exam_importance: summary.exam_importance,
      subject_name: emb.subject_name,
      exam_board: emb.exam_board,
      qualification_level: emb.qualification_level,
      topic_level: emb.topic_level,
      full_path: emb.full_path,
    };
  });
  
  // Upsert in batches of 1000
  const upsertBatchSize = 1000;
  for (let i = 0; i < metadata.length; i += upsertBatchSize) {
    const batch = metadata.slice(i, i + upsertBatchSize);
    await upsertTopicMetadata(batch);
    console.log(`  Saved ${Math.min(i + upsertBatchSize, metadata.length)}/${metadata.length}`);
  }
  
  console.log('\n✅ All metadata saved!\n');
  
  // Step 6: Cost estimate
  const embeddingTokens = topicsToProcess.length * 50; // ~50 tokens per topic
  const summaryTokens = topicsToProcess.length * 200;  // ~200 tokens per summary
  
  const embeddingCost = (embeddingTokens / 1_000_000) * 0.02;
  const summaryCost = (summaryTokens / 1_000_000) * 0.15;
  const totalCost = embeddingCost + summaryCost;
  
  console.log('💰 Estimated costs:');
  console.log(`  Embeddings: $${embeddingCost.toFixed(4)}`);
  console.log(`  Summaries:  $${summaryCost.toFixed(4)}`);
  console.log(`  Total:      $${totalCost.toFixed(4)}\n`);
  
  multibar.stop();
}

main().catch(console.error);
```

---

### Day 6-7: Run Batch Generation & Verify

#### 1. Set up environment

```bash
# Install dependencies
cd scripts/topic-ai-generation
npm install

# Create .env file
cat > .env << EOF
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
EOF
```

#### 2. Run the batch job

```bash
npm run generate
```

**Expected output:**
```
🚀 Starting topic metadata generation...

📥 Fetching topics from database...
Found 54942 topics

🔍 Checking for existing metadata...
0 topics already have metadata

📝 Processing 54942 topics...

🧠 Generating embeddings...
Embeddings   |████████████████████| 100% | 54942/54942 | ETA: 0s
✅ Generated 54942 embeddings

📝 Generating AI summaries & difficulty ratings...
Summaries    |████████████████████| 100% | 54942/54942 | ETA: 0s
✅ Generated 54942 summaries

💾 Saving to database...
  Saved 1000/54942
  Saved 2000/54942
  ...
  Saved 54942/54942

✅ All metadata saved!

💰 Estimated costs:
  Embeddings: $0.0550
  Summaries:  $1.6482
  Total:      $1.7032
```

**Time estimate:** 2-3 hours (depends on OpenAI API rate limits)

#### 3. Verify data

```sql
-- Check how many topics have metadata
SELECT COUNT(*) FROM topic_ai_metadata;
-- Should return 54942

-- Sample the data
SELECT 
  tam.topic_id,
  ct.topic_name,
  tam.plain_english_summary,
  tam.difficulty_band,
  tam.exam_importance,
  tam.full_path
FROM topic_ai_metadata tam
JOIN curriculum_topics ct ON tam.topic_id = ct.id
LIMIT 10;

-- Check difficulty distribution
SELECT 
  difficulty_band,
  COUNT(*) as count,
  ROUND(AVG(exam_importance), 2) as avg_importance
FROM topic_ai_metadata
GROUP BY difficulty_band;

-- Verify embeddings are valid
SELECT COUNT(*) 
FROM topic_ai_metadata 
WHERE array_length(embedding::real[], 1) = 1536;
-- Should return 54942
```

---

## Week 2: Search API + Topic Resolver

### Day 8-10: Build Search API

#### File Structure
```
/api/topics/
├── search-topics.js        # Main search endpoint
└── resolve-topic.js        # Topic resolver endpoint
```

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
 * Vector search with course filtering
 */
async function vectorSearchTopics(embedding, courseFilters, limit = 20) {
  const { examBoard, qualificationLevel, subjectName } = courseFilters;
  
  // Build WHERE clause for course filtering
  let query = supabase
    .from('topic_ai_metadata')
    .select(`
      topic_id,
      plain_english_summary,
      difficulty_band,
      exam_importance,
      subject_name,
      exam_board,
      qualification_level,
      topic_level,
      full_path
    `);
  
  // Apply course filters
  if (examBoard) query = query.eq('exam_board', examBoard);
  if (qualificationLevel) query = query.eq('qualification_level', qualificationLevel);
  if (subjectName) query = query.eq('subject_name', subjectName);
  
  // Vector similarity search
  query = query
    .select('*, similarity:embedding <=> $1', [JSON.stringify(embedding)])
    .order('similarity')
    .limit(limit);
  
  const { data, error } = await query;
  
  if (error) throw error;
  
  // Add confidence score (convert cosine distance to similarity)
  return data.map(topic => ({
    ...topic,
    confidence: Math.max(0, (1 - topic.similarity) * 100), // Convert to 0-100%
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
    
    // Step 1: Generate embedding for search query
    const queryEmbedding = await generateQueryEmbedding(searchQuery);
    
    // Step 2: Vector search with course filters
    const topicCandidates = await vectorSearchTopics(
      queryEmbedding,
      courseFilters || {},
      20
    );
    
    // Step 3: Group by confidence
    const exactMatches = topicCandidates.filter(t => t.confidence >= 70);
    const relatedMatches = topicCandidates.filter(t => t.confidence < 70 && t.confidence >= 40);
    
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

#### api/topics/resolve-topic.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TOPIC_RESOLVER_SYSTEM_PROMPT = `You are a matching engine that maps student-entered topic names
to an OFFICIAL syllabus topic list.

You are given:
- A specific exam course (level, board, subject).
- A list of candidate topics from semantic search (already filtered to top 20).
- The student's original search query.

RULES:
- Choose the BEST matching topic from the candidates.
- Consider:
  - Semantic similarity
  - Topic level (prefer leaf topics over broad ones)
  - Exam importance (prefer high-importance topics if tied)
- Provide 2-3 related topics that might also be useful.
- If no topic is a strong match (confidence < 40%), suggest creating a custom topic.

Return JSON:
{
  "best_match": {
    "topic_id": "string",
    "title": "string",
    "confidence": 0-100,
    "reason": "Why this is the best match",
    "full_path": ["breadcrumb", "array"]
  },
  "related_matches": [
    {
      "topic_id": "string",
      "title": "string",
      "confidence": 0-100,
      "reason": "Why this is related"
    }
  ],
  "suggest_custom": {
    "should_suggest": true/false,
    "custom_title": "student's query cleaned up",
    "reason": "why custom topic makes sense"
  }
}

Only output valid JSON.`;

/**
 * Topic resolver handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { searchQuery, candidates, courseContext } = req.body;
    
    // Prepare data for LLM
    const userData = {
      course: courseContext,
      student_query: searchQuery,
      candidates: candidates.map(c => ({
        topic_id: c.topic_id,
        title: c.full_path[c.full_path.length - 1], // Last item in path
        full_path: c.full_path,
        summary: c.plain_english_summary,
        difficulty: c.difficulty_band,
        importance: c.exam_importance,
        confidence_from_search: c.confidence,
      }))
    };
    
    // Call LLM
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: TOPIC_RESOLVER_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userData) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    
    const result = JSON.parse(completion.choices[0].message.content);
    
    return res.status(200).json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('Topic resolver error:', error);
    return res.status(500).json({ 
      error: 'Topic resolution failed',
      message: error.message 
    });
  }
}
```

---

### Day 11-12: Build React Hook for Search

#### hooks/useTopicSearch.ts

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface CourseFilters {
  examBoard?: string;
  qualificationLevel?: string;
  subjectName?: string;
}

interface TopicSearchResult {
  topic_id: string;
  plain_english_summary: string;
  difficulty_band: 'core' | 'standard' | 'challenge';
  exam_importance: number;
  subject_name: string;
  exam_board: string;
  qualification_level: string;
  topic_level: number;
  full_path: string[];
  confidence: number;
}

interface SearchResults {
  exact: TopicSearchResult[];
  related: TopicSearchResult[];
}

export function useTopicSearch(courseFilters?: CourseFilters) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchTopics = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch('/api/topics/search-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery,
          courseFilters,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [courseFilters]);

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    searchTopics,
    clearResults,
    isSearching,
    results,
    error,
  };
}
```

---

### Day 13-14: Testing & Optimization

#### Test Queries

```javascript
// Test script: scripts/test-search.js
const testQueries = [
  // Exact matches
  'osmosis',
  'cell membrane',
  'photosynthesis',
  
  // Student language
  'how plants make food',
  'osmosis in kidneys',
  'light dependent reactions ATP',
  
  // Typos
  'osmosys',
  'mithochondria',
  
  // Very specific
  'AQA Biology A-Level 3.4.2 DNA structure',
  
  // Ambiguous
  'cells',
  'transport',
];

async function runTests() {
  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    const results = await searchTopics(query, {
      examBoard: 'AQA',
      qualificationLevel: 'A_LEVEL',
      subjectName: 'Biology',
    });
    
    console.log(`  Exact matches: ${results.exact.length}`);
    console.log(`  Related matches: ${results.related.length}`);
    
    if (results.exact.length > 0) {
      console.log(`  Top result: ${results.exact[0].full_path.join(' > ')}`);
      console.log(`  Confidence: ${results.exact[0].confidence}%`);
    }
  }
}
```

#### Performance Benchmarks

Target metrics:
- **Vector search time:** < 50ms
- **Total search (with embedding generation):** < 500ms
- **Topic resolver (LLM call):** < 1000ms
- **End-to-end user experience:** < 2s

#### Optimization Checks

```sql
-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT *
FROM topic_ai_metadata
WHERE exam_board = 'AQA'
  AND qualification_level = 'A_LEVEL'
  AND subject_name = 'Biology'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 20;

-- Should show "Index Scan using topic_embedding_idx"
-- AND "Index Scan using topic_metadata_course_idx"
```

---

## Cost Estimates

### One-Time Batch Generation (54,942 topics):
- **Embeddings:** ~$0.055 (2.75M tokens)
- **AI Summaries:** ~$1.65 (11M tokens)
- **Total:** ~$1.70

### Ongoing Per-Search Costs:
- **Embedding generation:** $0.000002 per search (~100 tokens)
- **Topic resolver (optional):** $0.00003 per search (~200 tokens)
- **Monthly cost for 10,000 searches:** ~$0.32

---

## Success Criteria

By end of Week 2, you should have:

✅ **Database:**
- pgvector extension enabled
- topic_ai_metadata table with 54,942 rows
- Indexes created and optimized
- All embeddings generated

✅ **Batch Scripts:**
- Working generation pipeline
- Cost tracking
- Progress monitoring
- Error handling

✅ **API Endpoints:**
- `/api/topics/search-topics` working
- `/api/topics/resolve-topic` working
- Sub-500ms response times

✅ **React Hook:**
- `useTopicSearch` functional
- Integrated with course filters
- Error handling

✅ **Testing:**
- 10+ test queries validated
- Performance benchmarks met
- Confidence scores calibrated

---

## Next Steps (Week 3+)

With this foundation, you can build:
- Search UI component
- Course setup screen
- Topic detail views
- Browse hierarchy
- Card generation flow

**Ready to start implementation?** 🚀

