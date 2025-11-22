# Topic AI Metadata Generation

Batch generation of AI-enhanced metadata (embeddings + summaries) for all curriculum topics.

## What This Does

1. **Generates vector embeddings** for semantic search (54,942 topics)
2. **Creates AI summaries** in plain English for each topic
3. **Estimates difficulty** (core/standard/challenge)
4. **Calculates exam importance** (0.0-1.0)
5. **Stores everything** in `topic_ai_metadata` table

---

## Prerequisites

✅ Supabase database with topics loaded (54,942 topics)  
✅ pgvector extension enabled  
✅ `topic_ai_metadata` table created  
✅ Node.js 18+ installed  
✅ OpenAI API key with credits  
✅ Supabase service role key  

---

## Setup (First Time Only)

### 1. Install Dependencies

```bash
cd scripts/topic-ai-generation
npm install
```

### 2. Configure Environment

Create a `.env` file in this directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI Configuration
OPENAI_API_KEY=sk-your_openai_key_here
```

**Where to get these:**
- **SUPABASE_URL**: Supabase project settings → API
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase project settings → API → service_role (secret!)
- **OPENAI_API_KEY**: OpenAI dashboard → API keys

---

## Usage

### Option 1: Pilot Test (RECOMMENDED FIRST)

Test on 200 topics from AQA Biology:

```bash
npm run pilot
```

**What it does:**
- Processes 200 topics only
- AQA Biology A-Level
- Quick validation (~5 minutes)
- Costs: ~$0.006

**Expected output:**
```
🧪 PILOT MODE: Processing 200 topics
   Board: AQA
   Subject: Biology

💰 Estimated cost: $0.0062

Embeddings 1/1  |████████████| 100% | 200/200 | ETA: 0s
Summaries  1/1  |████████████| 100% | 200/200 | ETA: 0s
✅ Window 1 complete

🎉 GENERATION COMPLETE!
```

### Option 2: Dry Run (Check What Would Be Processed)

```bash
npm run dry-run
```

Shows coverage statistics without making changes.

### Option 3: Full Generation

Process all topics needing metadata:

```bash
npm run generate
```

**What it does:**
- Processes ALL topics without metadata
- Handles ~54,000 topics in windows of 2,000
- Takes 2-3 hours
- Costs: ~$1.70

**You'll be asked to confirm** before processing >1000 topics.

---

## How It Works

### Processing Flow

```
1. Fetch topics from topics_with_context view (paginated)
   ↓
2. Check which already have metadata (skip those)
   ↓
3. For each window of 2,000 topics:
   a. Generate embeddings (100 per API call)
   b. Generate AI summaries (5 concurrent calls)
   c. Save to database (500 per upsert)
   ↓
4. Verify coverage and show costs
```

### Incremental Processing

The script is **smart** - it only processes topics that don't have metadata:

- **First run:** Processes all 54,942 topics
- **Second run:** Processes 0 topics (all done)
- **After adding new board:** Only processes new topics

---

## Expected Results

### Pilot Test (200 topics)
- **Time:** 5-10 minutes
- **Cost:** $0.006
- **Output:** 200 rows in `topic_ai_metadata`

### Full Run (54,942 topics)
- **Time:** 2-3 hours
- **Cost:** ~$1.70
- **Output:** 54,942 rows in `topic_ai_metadata`

### Verify After Running

```sql
-- Check coverage
SELECT COUNT(*) FROM topic_ai_metadata;
-- Expected: 200 (pilot) or 54,942 (full)

-- Check difficulty distribution
SELECT 
  difficulty_band,
  COUNT(*) as count,
  ROUND(AVG(exam_importance), 2) as avg_importance
FROM topic_ai_metadata
GROUP BY difficulty_band;

-- Sample results
SELECT 
  tam.plain_english_summary,
  tam.difficulty_band,
  tam.exam_importance,
  tam.full_path
FROM topic_ai_metadata tam
LIMIT 5;
```

---

## Troubleshooting

### "Missing configuration" error
✅ Make sure `.env` file exists in this directory  
✅ Check all 3 variables are set  
✅ No quotes around values in .env

### "Failed to fetch topics" error
✅ Check Supabase URL is correct  
✅ Check service role key has admin access  
✅ Verify `topics_with_context` view exists

### "OpenAI API error" error
✅ Check API key is valid  
✅ Check you have credits in OpenAI account  
✅ Check rate limits (Tier 1 = 3,000 RPM)

### "Upsert failed" error
✅ Check `topic_ai_metadata` table exists  
✅ Check embedding dimension is 1536  
✅ Check vector index was created

### Process seems stuck
✅ Check progress bars are updating  
✅ Check console for errors  
✅ OpenAI can be slow during peak times  
✅ Ctrl+C to cancel, it's safe (uses upserts)

---

## Re-running After Errors

**Safe to re-run!** The script:
- ✅ Skips topics that already have metadata
- ✅ Uses UPSERT (not INSERT) - no duplicates
- ✅ Processes in windows - can resume where it left off
- ✅ Has retry logic for API failures

Just run `npm run generate` again.

---

## Cost Breakdown

### Embeddings (text-embedding-3-small)
- **Model cost:** $0.02 per 1M tokens
- **Tokens per topic:** ~50 tokens
- **54,942 topics:** ~2.75M tokens = $0.055

### Summaries (gpt-4o-mini)
- **Model cost:** $0.15 per 1M input tokens
- **Tokens per topic:** ~200 tokens
- **54,942 topics:** ~11M tokens = $1.65

### Total: ~$1.70 one-time

### Ongoing (incremental updates)
- **New board (5,000 topics):** ~$0.15
- **Spec update (500 topics):** ~$0.015
- **Re-generate summaries:** ~$1.65 (embeddings reused)

---

## What Gets Created

Each topic gets:

```javascript
{
  topic_id: "uuid",
  embedding: [1536 floats],  // For semantic search
  plain_english_summary: "DNA is structured as a double helix...",
  difficulty_band: "standard",
  exam_importance: 0.85,
  subject_name: "Biology",
  exam_board: "AQA",
  qualification_level: "A_LEVEL",
  topic_level: 3,
  full_path: ["Genetic information", "DNA and genes", "Structure of DNA"],
  is_active: true,
  spec_version: "v1"
}
```

---

## Next Steps After Generation

1. ✅ Verify data quality (run SQL checks above)
2. ✅ Test semantic search (query the RPC function)
3. ✅ Build search API endpoint
4. ✅ Integrate with app UI

---

## Files in This Directory

```
topic-ai-generation/
├── package.json                    # Dependencies
├── .env                           # Your API keys (create this)
├── .env.example                   # Template
├── config.js                      # Configuration
├── generate-topic-metadata.js     # Main script
├── lib/
│   ├── supabase-client.js        # Database operations
│   ├── openai-client.js          # OpenAI API wrapper
│   ├── embedding-generator.js    # Batch embedding logic
│   └── summary-generator.js      # AI summary generation
├── prompts/
│   └── topic-summary-prompt.js   # System prompt for summaries
└── README.md                      # This file
```

---

## Quick Start Commands

```bash
# First time setup
npm install
cp .env.example .env
# Edit .env with your keys

# Run pilot test (200 topics, $0.006)
npm run pilot

# Check what would be processed
npm run dry-run

# Run full generation (54,942 topics, $1.70)
npm run generate
```

---

**Ready to start?** Run `npm run pilot` first! 🚀

