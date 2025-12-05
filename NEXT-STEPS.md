# Next Steps - Clean Curriculum Rebuild

## ✅ WHAT YOU JUST COMPLETED

**Database Setup:** DONE!
- Old data archived safely
- New clean tables created
- Staging schemas ready
- Ready for Firecrawl scraping

---

## 📋 YOUR NEXT ACTIONS

### Day 2: Set Up Firecrawl (30 minutes)

1. **Get Firecrawl API key:**
   - Go to https://firecrawl.dev
   - Sign up / Log in
   - Get your API key from dashboard

2. **Add to environment variables:**
   ```bash
   # In flash-curriculum-pipeline folder
   # Create .env file:
   FIRECRAWL_API_KEY=your_key_here
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Install Firecrawl SDK:**
   ```bash
   cd "flash-curriculum-pipeline"
   npm install @mendable/firecrawl-js
   ```

### Day 3-4: Test & Scale AQA (6 hours)

1. **Test with 1 subject:**
   ```bash
   node test-firecrawl-aqa-biology.js
   ```
   - Should scrape AQA Biology
   - Upload to `staging_aqa` tables
   - Verify ~60-70 topics

2. **If test works, scale to all AQA:**
   - Modify script to loop through all subjects
   - Or use the ChatGPT suggestions for batch scraping
   - Check data quality in Supabase

### Day 5: Migrate to Production (2 hours)

1. **Copy AQA data: staging → production**
   - Simple INSERT from staging_aqa.topics to curriculum_topics
   - Link parent_topic_id correctly

2. **Test in app:**
   - Open FLASH app
   - Go through onboarding
   - Select AQA subjects
   - Verify topics appear

### Week 2: Expand to Other Boards

- Repeat for OCR, Edexcel
- Optional: WJEC, CCEA, SQA

---

## 📁 FILES TO KEEP

**Essential:**
- `SIMPLE-CLEAN-START.sql` ✅ (already ran this)
- `CURRICULUM-SCRAPING-STRATEGY.md` ✅ (overall strategy)
- `2-WEEK-REBUILD-ROADMAP.md` ✅ (detailed plan)
- `test-firecrawl-aqa-biology.js` ✅ (test script)
- `DIAGNOSTIC-QUERIES-RUN-NOW.sql` ✅ (for checking data quality)

**Optional Reference:**
- Old archive tables in Supabase (can delete after 1 month)

---

## 🎯 BOTTOM LINE

**Database:** ✅ Ready  
**Next:** Get Firecrawl API key  
**Then:** Test scraping 1 subject  
**Goal:** Clean AQA data in production by end of week

You're on track!

