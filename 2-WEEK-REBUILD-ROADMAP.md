# 2-Week Clean Database Rebuild Roadmap
**Target:** Launch-ready curriculum data by end of Week 2

---

## 🎯 OVERVIEW

**Philosophy:** Quality over quantity. Get AQA perfect, then expand.

**Week 1:** AQA (your biggest/most important board) + Infrastructure  
**Week 2:** OCR + Edexcel + Polish

**Why this works:**
- AQA is ~40% of UK students
- If AQA is perfect, users will be happy
- Can add other boards post-launch if needed

---

## 📅 WEEK 1: FOUNDATION + AQA

### Monday (Day 1) - 4 hours
**Goal:** Fresh database + Firecrawl setup

**Tasks:**
1. ✅ Run `FRESH-START-NEW-DATABASE.sql` in Supabase (30 min)
2. ✅ Set up Firecrawl account (30 min)
   - Sign up at https://firecrawl.dev
   - Get API key
   - Add to environment variables
3. ✅ Install dependencies (30 min)
   ```bash
   npm install @mendable/firecrawl-js
   # OR for Python
   pip install firecrawl-py
   ```
4. ✅ Test Firecrawl with ONE page (2 hours)
   - Scrape AQA Biology subject content page
   - Parse markdown output
   - Verify topic extraction works
   - Upload to `staging_aqa.subjects` and `staging_aqa.topics`

**Success Criteria:**
- ✅ New database schema created
- ✅ Firecrawl working
- ✅ Can scrape + parse + upload 1 subject (AQA Biology)
- ✅ See clean data in staging_aqa tables

**Deliverable:** `test-firecrawl-aqa-biology.js` script working

---

### Tuesday (Day 2) - 6 hours
**Goal:** Scale AQA scraper to all subjects

**Tasks:**
1. ✅ Create AQA subject list (1 hour)
   - List all AQA A-Level subjects (~40)
   - List all AQA GCSE subjects (~37)
   - Total: ~77 subjects
2. ✅ Build batch scraper (2 hours)
   - Loop through all subjects
   - Use Firecrawl `/map` to discover pages
   - Crawl each subject's content
   - Parse and upload to staging
3. ✅ Run scraper (2 hours)
   - Scrape all AQA subjects
   - Monitor progress
   - Handle errors
4. ✅ Quality check (1 hour)
   - Verify topic counts reasonable
   - Check for duplicates
   - Sample 10 subjects manually

**Success Criteria:**
- ✅ All ~77 AQA subjects scraped
- ✅ Data in `staging_aqa.subjects` and `staging_aqa.topics`
- ✅ No duplicates
- ✅ Topic counts look reasonable (30-150 per subject)

**Deliverable:** `scrape-all-aqa.js` script + data in staging

---

### Wednesday (Day 3) - 4 hours
**Goal:** Validate AQA data quality

**Tasks:**
1. ✅ Run validation queries (1 hour)
   - Check AQA Biology has 7 top-level topics (3.1-3.7)
   - Check AQA Maths has sections A-S
   - Check AQA History has option codes (1A-1W)
   - Check AQA Accounting has ~17 topics (not 294!)
2. ✅ Fix any issues (2 hours)
   - Re-scrape subjects with errors
   - Adjust parser for edge cases
   - Re-upload corrected data
3. ✅ Document findings (1 hour)
   - Which subjects were easy to scrape
   - Which needed special handling
   - Note any missing data

**Success Criteria:**
- ✅ AQA Biology: 7 top-level topics ✅
- ✅ AQA Maths: A-S sections present ✅
- ✅ AQA Accounting: ~17 topics ✅
- ✅ All subjects pass validation

**Deliverable:** Validation report + clean staging data

---

### Thursday (Day 4) - 4 hours
**Goal:** Migrate AQA to production

**Tasks:**
1. ✅ Create migration script (1 hour)
   - Map `staging_aqa.topics` → `curriculum_topics`
   - Adjust topic levels (staging 0-3 → production 1-4)
   - Link to `exam_board_subjects`
2. ✅ Run migration (1 hour)
   - Backup staging tables first
   - Run migration
   - Verify data in production
3. ✅ Test in app (2 hours)
   - Test onboarding flow with AQA
   - Try multiple subjects
   - Check TopicEditModal
   - Verify topic counts
   - Test creating flashcards

**Success Criteria:**
- ✅ AQA data in production `curriculum_topics`
- ✅ App works with new data
- ✅ No errors in console
- ✅ Users can select topics and create cards

**Deliverable:** Working app with AQA data

---

### Friday (Day 5) - 4 hours
**Goal:** Exam papers (optional but valuable)

**Tasks:**
1. ✅ Scrape AQA past papers (2 hours)
   - Use Firecrawl to find paper PDFs
   - Extract years, series, paper numbers
   - Store URLs in `staging_aqa.exam_papers`
2. ✅ Test paper downloads (1 hour)
   - Verify paper URLs work
   - Check mark schemes available
   - Check examiner reports available
3. ✅ Plan AI integration (1 hour)
   - Document how papers could be used
   - Plan mark scheme extraction
   - Design question bank structure

**Success Criteria:**
- ✅ Past papers cataloged for top 10 subjects
- ✅ URLs stored in database
- ✅ Plan for future AI extraction

**Deliverable:** Exam papers database + integration plan

---

## 📅 WEEK 2: EXPAND + POLISH

### Monday (Day 6) - 5 hours
**Goal:** OCR scraping

**Tasks:**
1. ✅ Adapt scraper for OCR (2 hours)
   - OCR uses different site structure
   - Modules 1-6 format
   - Update Firecrawl config
2. ✅ Scrape all OCR subjects (2 hours)
   - A-Level: ~46 subjects
   - GCSE: ~33 subjects
3. ✅ Quality check (1 hour)
   - Verify OCR Biology A has Modules 1-6
   - Check topic counts
   - Fix any issues

**Success Criteria:**
- ✅ OCR data in `staging_ocr`
- ✅ Modules 1-6 structure preserved
- ✅ Quality validated

**Deliverable:** OCR staging data

---

### Tuesday (Day 7) - 4 hours
**Goal:** Edexcel scraping

**Tasks:**
1. ✅ Adapt scraper for Edexcel (2 hours)
   - PDF-first approach
   - Topics 1-10 structure
   - Update Firecrawl config
2. ✅ Scrape Edexcel subjects (1.5 hours)
   - A-Level: ~40 subjects
   - GCSE: ~39 subjects
3. ✅ Quality check (0.5 hours)
   - Verify Biology B has Topics 1-10
   - Validate data

**Success Criteria:**
- ✅ Edexcel data in `staging_edexcel`
- ✅ Topics 1-10 structure correct
- ✅ Quality validated

**Deliverable:** Edexcel staging data

---

### Wednesday (Day 8) - 4 hours
**Goal:** Migrate OCR + Edexcel to production

**Tasks:**
1. ✅ Migrate OCR (1.5 hours)
   - Run migration script
   - Verify in production
2. ✅ Migrate Edexcel (1.5 hours)
   - Run migration script
   - Verify in production
3. ✅ Test in app (1 hour)
   - Test all three boards
   - Verify no regressions

**Success Criteria:**
- ✅ AQA + OCR + Edexcel all in production
- ✅ App works with all boards
- ✅ No duplicate data

**Deliverable:** App with 3 major boards

---

### Thursday (Day 9) - 4 hours
**Goal:** WJEC + CCEA + SQA (optional)

**Tasks:**
1. ✅ Quick wins only (4 hours)
   - Use existing Topic List Scraper data if good
   - OR do quick Firecrawl scrapes
   - Focus on popular subjects only
   - Don't aim for perfection

**Success Criteria:**
- ✅ Some data for WJEC/CCEA/SQA
- ✅ Better than nothing
- ✅ Can improve post-launch

**Deliverable:** Basic coverage of all boards

---

### Friday (Day 10) - 6 hours
**Goal:** Polish + Final Testing

**Tasks:**
1. ✅ Run full data quality report (1 hour)
   - Check all boards
   - Verify topic counts
   - Check for duplicates
   - Validate relationships
2. ✅ Fix critical issues (2 hours)
   - Address any show-stoppers
   - Re-scrape problem subjects
3. ✅ End-to-end app testing (2 hours)
   - Test full onboarding flow
   - Test all boards
   - Test topic curation
   - Test card generation
   - Test study mode
4. ✅ Documentation (1 hour)
   - Document what was scraped
   - Note any limitations
   - Plan for post-launch improvements

**Success Criteria:**
- ✅ App fully functional
- ✅ No critical bugs
- ✅ Data quality acceptable
- ✅ Ready for launch

**Deliverable:** Launch-ready app!

---

## 📊 EXPECTED OUTCOMES

### By End of Week 1:
- ✅ AQA: ~7,000 topics (all subjects, perfect quality)
- ✅ Infrastructure in place
- ✅ Firecrawl working
- ✅ App functional with AQA

### By End of Week 2:
- ✅ AQA: ~7,000 topics (perfect)
- ✅ OCR: ~5,000 topics (good)
- ✅ Edexcel: ~4,000 topics (good)
- ✅ WJEC: ~2,000 topics (basic)
- ✅ CCEA: ~500 topics (basic)
- ✅ SQA: ~1,000 topics (basic)
- **Total: ~19,500 clean topics** (vs. 2M+ duplicates before!)

### Quality Metrics:
- ✅ Zero duplicates
- ✅ Proper hierarchy (parent-child relationships)
- ✅ Version tracking
- ✅ Spec URLs captured
- ✅ Ready for bi-annual updates

---

## 🚀 POST-LAUNCH IMPROVEMENTS (Months 2-3)

After successful launch, you can:

1. **Week 3-4:** Perfect WJEC, CCEA, SQA with Firecrawl
2. **Week 5-6:** Add exam papers for all boards
3. **Week 7-8:** AI extraction of mark schemes
4. **Week 9-10:** Build question bank from papers
5. **Week 11-12:** Examiner report insights

---

## 🛠️ TOOLS YOU'LL USE

### Week 1:
- Firecrawl (web scraping)
- Node.js or Python (parsing)
- Supabase SQL Editor (database)
- VS Code (coding)

### Week 2:
- Same tools
- More automation
- Testing scripts

---

## 💰 COST ESTIMATE

### Firecrawl:
- Week 1 AQA: ~15,000 credits = ~$7.50
- Week 2 OCR+Edexcel: ~20,000 credits = ~$10
- Week 2 WJEC+CCEA+SQA: ~10,000 credits = ~$5
- **Total: ~$22.50 for all boards**

### Time:
- Week 1: ~22 hours
- Week 2: ~23 hours
- **Total: ~45 hours over 2 weeks**

Totally doable before launch!

---

## ✅ DAILY CHECKLIST

Copy this each day:

```
[ ] Morning: Review yesterday's progress
[ ] Set daily goal (from roadmap above)
[ ] Work 4-6 hours on tasks
[ ] Run validation queries
[ ] Fix any critical issues
[ ] Document findings
[ ] Commit to GitHub
[ ] Evening: Review tomorrow's plan
```

---

## 🆘 IF YOU GET STUCK

**Scraping issues?**
- Try the subject manually in browser first
- Check Firecrawl API docs
- Adjust `includePaths` in config
- Ask me for help with specific subjects

**Data quality issues?**
- Run validation queries
- Compare with official spec PDFs
- Re-scrape if needed
- It's OK to skip difficult subjects initially

**App issues?**
- Check database relationships
- Verify topic_level mapping
- Test with simple subject first
- Check console for errors

---

## 🎯 MINIMUM VIABLE LAUNCH

If time gets tight, you can launch with:
- ✅ AQA only (~7,000 topics)
- ✅ OR AQA + OCR (~12,000 topics)
- ✅ Add other boards week after launch

**AQA alone covers ~40% of UK students - that's a successful launch!**

---

## 📞 GET HELP

If you need help at any point:
1. Share your Firecrawl output
2. Share validation query results  
3. Share specific error messages
4. I'll help debug and fix!

**You've got this!** 🚀

Let's start with Day 1 tomorrow. Ready?

