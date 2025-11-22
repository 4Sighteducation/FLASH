# Topic Data Lifecycle

## Overview
How topics flow from scraping → embedding → search → user selection, and how to handle updates over time.

---

## Topic States

```
SCRAPED → EMBEDDED → SUMMARIZED → LIVE → DEPRECATED
```

### 1. **SCRAPED**
**Location:** `curriculum_topics` table  
**Status:** Raw curriculum data from exam board websites

**Has:**
- ✅ topic_name, topic_code
- ✅ hierarchical relationships (parent_topic_id)
- ✅ exam_board_subject_id (links to subject/board/level)

**Missing:**
- ❌ AI embeddings
- ❌ Plain English summaries
- ❌ Difficulty ratings
- ❌ Searchability

**Example:**
```sql
id: "abc-123"
topic_name: "3.4.2 Structure of DNA"
topic_code: "3.4.2"
topic_level: 3
parent_topic_id: "parent-xyz"
```

---

### 2. **EMBEDDED**
**Location:** `topic_ai_metadata` table (partial)  
**Status:** Vector embedding generated, but no summary yet

**Has:**
- ✅ 1536-dimension vector embedding
- ✅ Searchable via semantic search
- ❌ No AI summary yet (can show raw topic_name)

**When:** Rare - usually embedding & summary happen together

---

### 3. **SUMMARIZED** 
**Location:** `topic_ai_metadata` table (complete)  
**Status:** Full AI metadata generated - ready for users

**Has:**
- ✅ Vector embedding
- ✅ plain_english_summary
- ✅ difficulty_band (core/standard/challenge)
- ✅ exam_importance (0.0-1.0)
- ✅ full_path (breadcrumb array)
- ✅ is_active = true

**Example:**
```sql
topic_id: "abc-123"
embedding: [0.023, -0.154, 0.087, ...]
plain_english_summary: "Learn how DNA is structured as a double helix..."
difficulty_band: "standard"
exam_importance: 0.85
full_path: ['Genetic information', 'DNA and chromosomes', 'Structure of DNA']
is_active: true
spec_version: 'v1'
```

---

### 4. **LIVE**
**Status:** Students actively using this topic

**Appears in:**
- Search results
- Browse hierarchy
- Topic recommendations
- Card generation options

**Tracked in:**
```sql
-- When student selects this topic
INSERT INTO user_topics (user_id, topic_id)

-- When student creates cards
INSERT INTO flashcards (user_id, topic_id, ...)
```

**Metrics:**
- How many students studying this topic?
- How many cards created?
- Average performance?

---

### 5. **DEPRECATED**
**Status:** Spec updated, topic no longer current

**Has:**
- ✅ Still exists in database (don't delete!)
- ✅ is_active = false
- ✅ spec_version changed (e.g., 'v1_deprecated')

**Behavior:**
- ❌ New students DON'T see it in search/browse
- ✅ Existing students still see it (their history)
- ✅ Their flashcards still work
- ✅ Stats/progress preserved

**Example:**
```sql
-- Old spec topic
topic_id: "old-123"
is_active: false
spec_version: 'v1_2024_deprecated'

-- New spec topic (same concept, different structure)
topic_id: "new-456"
is_active: true
spec_version: 'v2_2027'
```

---

## Pipeline Operations

### **Initial Setup (One-Time)**

```bash
# 1. Scrape curriculum → loads curriculum_topics
python scrapers/aqa/scrape-biology.py

# 2. Migrate to production
-- SQL: migrate-all-staging-to-production-FIXED.sql

# 3. Generate AI metadata
cd scripts/topic-ai-generation
npm run generate
```

**Result:** All topics are SUMMARIZED and LIVE

---

### **Add New Exam Board (Incremental)**

```bash
# 1. Scrape new board
python scrapers/wjec/scrape-all-subjects.py

# 2. Migrate new data
-- SQL: migrate-all-staging-to-production-FIXED.sql
-- Only inserts new topics, existing ones unchanged

# 3. Generate metadata for NEW topics only
npm run generate
# Script automatically detects topics without metadata
```

**Result:** New board topics become LIVE, existing topics untouched

**Time:** ~30 minutes for 5,000 new topics  
**Cost:** ~$0.15

---

### **Update Existing Spec (Version Change)**

Example: AQA Biology spec changes from v1 (2024-2026) to v2 (2027+)

```sql
-- 1. Mark old topics as deprecated (DON'T DELETE)
UPDATE topic_ai_metadata
SET 
  is_active = false,
  spec_version = 'v1_2024_deprecated',
  last_updated = NOW()
WHERE exam_board = 'AQA'
  AND qualification_level = 'A_LEVEL'
  AND subject_name = 'Biology'
  AND spec_version = 'v1';

-- 2. Also mark in curriculum_topics (optional, for clarity)
UPDATE curriculum_topics ct
SET is_active = false  -- Add this column if needed
FROM exam_board_subjects ebs
WHERE ct.exam_board_subject_id = ebs.id
  AND ebs.exam_board_id = (SELECT id FROM exam_boards WHERE code = 'AQA')
  AND ebs.qualification_type_id = (SELECT id FROM qualification_types WHERE code = 'A_LEVEL')
  AND ebs.subject_name = 'Biology';
```

```bash
# 3. Scrape new v2 spec → creates NEW topics with new IDs
python scrapers/aqa/scrape-biology-v2.py

# 4. Migrate new topics
-- SQL: migrate-all-staging-to-production-FIXED.sql

# 5. Generate metadata for new v2 topics
npm run generate
```

**Behavior:**
- Students who started in 2024-2026: Still see v1 topics in their profile
- New students starting 2027: Only see v2 topics
- No data loss, clean transition

---

### **Improve AI Summaries (Re-generation)**

If you update your summary prompt to be better:

```bash
# Option 1: Re-generate for specific subject
DELETE FROM topic_ai_metadata
WHERE subject_name = 'Biology' AND exam_board = 'AQA';

npm run generate  # Re-processes those topics

# Option 2: Re-generate everything
TRUNCATE topic_ai_metadata;
npm run generate  # Costs ~$1.70 again
```

---

### **Daily/Weekly Maintenance**

Set up a cron job to keep metadata fresh:

```bash
#!/bin/bash
# scripts/cron/update-topic-metadata.sh

# Check for new topics and generate metadata
cd /path/to/flash/scripts/topic-ai-generation
npm run generate

# Log results
echo "$(date): Metadata update completed" >> logs/metadata-updates.log
```

**Cron schedule:**
```
# Run every Sunday at 2 AM
0 2 * * 0 /path/to/scripts/cron/update-topic-metadata.sh
```

**Cost:** Usually $0 (no new topics), occasionally $0.05-0.50 (new subjects added)

---

## Monitoring & Health Checks

### Coverage Check
```sql
-- What % of topics have AI metadata?
SELECT 
  'Coverage Check' as metric,
  COUNT(DISTINCT ct.id) as total_topics,
  COUNT(DISTINCT tam.topic_id) as with_metadata,
  ROUND(
    COUNT(DISTINCT tam.topic_id)::numeric / 
    NULLIF(COUNT(DISTINCT ct.id), 0) * 100, 
    1
  ) as coverage_pct
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
LEFT JOIN topic_ai_metadata tam ON ct.id = tam.topic_id AND tam.is_active = true
WHERE ebs.is_current = true;

-- Expected: 100% after initial setup
-- If < 100%: run `npm run generate`
```

### Quality Check
```sql
-- Difficulty distribution (should be varied, not all 'standard')
SELECT 
  difficulty_band,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 1) as percentage
FROM topic_ai_metadata
WHERE is_active = true
GROUP BY difficulty_band;

-- Expected: 
-- core: 20-30%
-- standard: 50-60%
-- challenge: 20-30%
```

### Search Performance Check
```sql
-- Test vector search speed
EXPLAIN ANALYZE
SELECT * FROM match_topics(
  (SELECT embedding FROM topic_ai_metadata LIMIT 1),
  'AQA', 'A_LEVEL', 'Biology',
  0.0, 20
);

-- Should show:
-- "Index Scan using topic_embedding_hnsw_idx"
-- Execution time: < 50ms
```

---

## Rollback Procedures

### If Metadata Generation Fails Mid-Batch

The script processes in windows and upserts, so it's safe to:

```bash
# Just re-run - it will skip completed topics
npm run generate
```

### If Bad Summaries Were Generated

```sql
-- Delete bad batch by date
DELETE FROM topic_ai_metadata
WHERE generated_at > '2025-11-22 10:00:00';

-- Re-run generation
```

### If Vector Index is Slow

```sql
-- Drop and rebuild
DROP INDEX topic_embedding_hnsw_idx;

-- Try IVFFlat instead
CREATE INDEX topic_embedding_ivf_idx ON topic_ai_metadata 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Retest search performance
```

---

## Future Additions

### When You Add Past Paper Data
```sql
ALTER TABLE topic_ai_metadata
ADD COLUMN past_paper_frequency INTEGER DEFAULT 0,
ADD COLUMN last_appeared_year INTEGER;

-- Update from exam_papers data
UPDATE topic_ai_metadata tam
SET past_paper_frequency = (
  SELECT COUNT(*) FROM exam_papers ep
  WHERE ep.topic_codes @> ARRAY[ct.topic_code]
);
```

### When You Add User Popularity Signals
```sql
ALTER TABLE topic_ai_metadata
ADD COLUMN total_cards_created INTEGER DEFAULT 0,
ADD COLUMN unique_users_studying INTEGER DEFAULT 0,
ADD COLUMN avg_card_performance FLOAT;

-- Update nightly
UPDATE topic_ai_metadata tam
SET 
  total_cards_created = (SELECT COUNT(*) FROM flashcards WHERE topic_id = tam.topic_id),
  unique_users_studying = (SELECT COUNT(DISTINCT user_id) FROM user_topics WHERE topic_id = tam.topic_id);
```

---

## Key Principles

1. **Never delete topics** - mark as inactive instead
2. **UUIDs are stable** - don't reuse IDs across spec versions
3. **Metadata is regeneratable** - it's derived from topics, so safe to delete and regenerate
4. **Incremental by default** - script only processes what's missing
5. **Version everything** - spec_version tracks which curriculum version
6. **Monitor coverage** - should always be 100% for active boards

---

## Quick Reference Commands

```bash
# Generate metadata for new topics only
npm run generate

# Generate for specific board only
npm run generate -- --board=AQA

# Pilot test (200 topics)
npm run generate -- --pilot

# Force regenerate everything
npm run generate -- --force

# Check what needs processing
npm run generate -- --dry-run
```

---

**Updated:** November 22, 2025  
**Next Review:** After first production deployment (Feb 2026)

