# 🚀 Run These Migrations in Supabase

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor
- Go to your Supabase project
- Click "SQL Editor" in left sidebar
- Click "New query"

---

### 2. Run Main Setup (Migration 001)

**Copy & paste this entire file:**
```
001_setup_pgvector_topic_search.sql
```

**Click "Run"**

**Expected output:**
- "pgvector extension is enabled ✓"
- "HNSW index created successfully ✓" (or IVFFlat fallback)
- No errors

**Time:** ~10 seconds

---

### 3. Verify Setup Worked

**Copy & paste this entire file:**
```
001_verify_setup.sql
```

**Click "Run"**

**Expected output:**
You should see 8 checks all passing:
- ✅ Check 1: pgvector Extension
- ✅ Check 2: topic_ai_metadata Table (0 rows initially)
- ✅ Check 3: Indexes Created (6-7 indexes)
- ✅ Check 4: topics_with_context View (~54,000 topics)
- ✅ Check 5: Topics Needing Metadata (~54,000)
- ✅ Check 6: Sample Topics (10 samples)
- ✅ Check 7: match_topics RPC function works
- ✅ Check 8: Topics by Exam Board
- 🎉 SETUP COMPLETE!

**Time:** ~5 seconds

---

### 4. If Any Errors:

**Error: "pgvector extension not available"**
- Your Supabase project might not support pgvector
- Contact Supabase support to enable it
- Or upgrade to a plan that includes pgvector

**Error: "HNSW not supported"**
- This is fine! The script will fallback to IVFFlat automatically
- You'll see: "IVFFlat index created successfully ✓"
- Performance will be slightly slower but still good

**Error: "topics_with_context returns 0 rows"**
- Make sure you ran the migration that loaded 54,942 topics
- Check: `SELECT COUNT(*) FROM curriculum_topics;`
- Should return ~54,000

**Error: "relation curriculum_topics does not exist"**
- You need to run the topic migration first
- Go back to: `flash-curriculum-pipeline/database/migrations/migrate-all-staging-to-production-FIXED.sql`

---

### 5. What You Just Created:

✅ **topic_ai_metadata table** - Will store embeddings + AI summaries  
✅ **Vector indexes** - Makes semantic search fast  
✅ **topics_with_context view** - Helper for batch processing  
✅ **match_topics() function** - RPC for vector search from app  
✅ **get_topics_needing_metadata()** - Helper to find gaps  

---

### 6. Next Steps:

After Supabase setup completes:

**MONDAY:**
1. ✅ Run these SQL files in Supabase (DONE)
2. Build batch generation scripts (Node.js)
3. Run pilot test (200 topics)

**TUESDAY:**
4. Run full batch on your 70% of topics
5. Verify data quality

**WEDNESDAY:**
6. Build search API
7. Test search queries

Let me know when Supabase setup is complete! 🎯

