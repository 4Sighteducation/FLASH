# Onboarding Wizard Testing Guide
**Created:** November 24, 2025  
**Status:** Ready for Testing  

---

## 🎯 What's Been Built

A complete onboarding wizard that includes **first topic discovery with AI search** built right into the onboarding flow.

### **New Onboarding Flow:**

```
1. Welcome Screen (3 steps explaining app)
   ↓
2. Exam Type Selection (GCSE, A-Level, etc.)
   ↓
3. Subject Selection (Choose subjects)
   ↓
4. 🆕 First Topic Wizard (NEW! - with AI search)
   ↓
5. Onboarding Complete
   ↓
6. Main App
```

---

## 🆕 **FirstTopicWizard Features**

### **Step 1: Introduction**
- Explains how topic search works
- Shows example topics user can try
- Can skip if they prefer to add topics later

### **Step 2: Search Interface**
- **Real-time AI-powered search**
- Search bar with debouncing (500ms)
- Subject tabs (if user has multiple subjects)
- Results show:
  - Topic name
  - Plain English summary
  - Breadcrumb path (e.g., "Cells > Cell Structure")
  - Exam importance bar
- Multi-select (checkboxes)
- Bottom action bar shows selected count

### **Step 3: Optional Add More**
- After selecting topics, option to:
  - Add more topics (go back to search)
  - Start creating cards (finish onboarding)

---

## 🧪 How to Test the Complete Flow

### **Test 1: New User Complete Flow**

1. **Create New Account:**
   ```
   - Sign up with new email
   - Should land on Welcome screen
   ```

2. **Go Through Welcome (3 steps):**
   ```
   Step 1: "Welcome to FLASH!"
   Step 2: "How This Works" (features list)
   Step 3: "Let's Get You Set Up"
   ```

3. **Select Exam Type:**
   ```
   - Choose: GCSE
   - Click "Continue"
   ```

4. **Select Exam Board & Subjects:**
   ```
   - Choose: Edexcel
   - Select subjects: Biology (GCSE)
   - Click "Continue (1 subject selected)"
   ```

5. **🆕 First Topic Wizard:**
   ```
   Step 1: Introduction
   - See example topics
   - Click "Start Searching" or select an example

   Step 2: Search
   - Type: "photosynthesis"
   - Wait for results (should appear in 1-2 seconds)
   - Select 1-3 topics (checkbox them)
   - Click "Continue with X topics" button

   Step 3: Add More?
   - Choose "Start Creating Cards"
   ```

6. **Complete Onboarding:**
   ```
   - See success screen
   - Click "Start Learning"
   - Should land on Home screen
   ```

---

### **Test 2: Search with Multiple Subjects**

1. Follow Test 1, but in step 4:
   ```
   - Select multiple subjects: 
     • Biology (GCSE)
     • Chemistry (GCSE)
     • Physics (GCSE)
   ```

2. In First Topic Wizard step 2:
   ```
   - Should see subject tabs: [Bio] [Chem] [Phys]
   - Click Chemistry tab
   - Type: "periodic table"
   - Results should be Chemistry topics only
   - Switch to Physics tab
   - Type: "forces"
   - Results should be Physics topics only
   ```

---

### **Test 3: Skip Functionality**

1. Go through onboarding normally

2. At First Topic Wizard:
   ```
   - Click "Skip for now" button
   - Should go directly to Complete screen
   - No topics added (that's OK)
   ```

---

### **Test 4: Search Quality**

Try these searches to test AI quality:

**Biology (GCSE):**
- "photosynthesis" ✅ Should find plant biology topics
- "double circulatory system" ✅ Should find heart/circulatory topics
- "DNA" ✅ Should find genetics topics

**Chemistry (GCSE):**
- "periodic table" ✅ Should find element/atom topics
- "covalent bonds" ✅ Should find bonding topics

**Physics (GCSE):**
- "forces" ✅ Should find mechanics topics
- "electricity" ✅ Should find circuit topics

---

## ⚠️ **Expected Behaviors**

### **Normal:**
- ✅ Search takes 1-2 seconds (AI embedding generation + vector search)
- ✅ Results show 1-10 topics (depending on relevance)
- ✅ Confidence may be low (1-5%) - this is expected due to current embeddings
- ✅ Subject tabs only appear if user selected multiple subjects
- ✅ Can skip wizard entirely and add topics later

### **Edge Cases:**
- 📝 Search with < 2 characters: No search triggered
- 📝 No results found: Shows "No topics found" message
- 📝 OpenAI API timeout: Shows error, can retry
- 📝 No internet: Search won't work, but can skip

---

## 🐛 **Known Issues & Limitations**

1. **Low Search Relevance (1-5% confidence)**
   - **Why:** Embeddings generated from summaries only, not topic names
   - **Impact:** Sometimes returns loosely related topics
   - **Workaround:** Show more results (currently 10), user can browse
   - **Fix:** Regenerate embeddings with topic names (Phase 2)

2. **Subject Name Format Required**
   - **Why:** Database stores `"Biology (GCSE)"` not `"Biology"`
   - **Impact:** Must format subject correctly for search
   - **Status:** Handled in code automatically

3. **Search Requires Internet**
   - **Why:** Calls OpenAI API for embeddings
   - **Impact:** Won't work offline
   - **Workaround:** Skip button available

---

## 📊 **Success Criteria**

### **Minimum Success (MVP):**
- [ ] User can complete onboarding flow
- [ ] Search returns relevant topics in <3 seconds
- [ ] User can select and add topics
- [ ] Skip option works
- [ ] No crashes or errors

### **Good Success:**
- [ ] Search results feel accurate (70%+ relevance subjectively)
- [ ] Multi-subject tabs work smoothly
- [ ] User understands how to use search
- [ ] Breadcrumbs provide helpful context

### **Great Success:**
- [ ] User finds it faster than browsing hierarchy
- [ ] User adds 3-5 topics in first session
- [ ] User feedback: "Easy to find what I need"

---

## 🔄 **What Happens After Onboarding?**

### **Topics Added:**
Topics selected in wizard are stored in database but don't have cards yet.

### **Next Steps for User:**
1. Land on Home screen
2. See their subjects (Biology, Chemistry, etc.)
3. Click subject → See topic list
4. Click topic → Create cards

### **Future Enhancement:**
After wizard, could auto-prompt: "Create cards for your first topic now?"

---

## 🚀 **Next Phase: Main App Search**

After onboarding wizard works, we'll build:

1. **Phase 1:** Add search to main app (CardSubjectSelector)
2. **Phase 2:** Build "Card Bank" concept (Topics tab)
3. **Phase 3:** UI modernization with cyber theme

---

## 💾 **Database Changes**

No new tables required! Uses existing:
- `topic_ai_metadata` (embeddings + summaries)
- `user_subjects` (user's selected subjects)
- `curriculum_topics` (topic hierarchy)

---

## 🎨 **Design Notes**

### **Color Scheme:**
- Background: `#000` (black)
- Primary: `#FF006E` (neon pink)
- Secondary: `#00F5FF` (cyan)
- Text: `#FFF` (white), `#AAA` (gray)
- Cards: `#0A0A0A`, `#1A1A1A` (dark grays)

### **Key UI Elements:**
- Neon glowing buttons
- Smooth animations
- Progress dots at top
- Breadcrumb trails for context
- Multi-select checkboxes
- Bottom action bar (sticky)

---

## 🧹 **Clean Up Between Tests**

To test onboarding multiple times:

```sql
-- Reset user's onboarding status
UPDATE users 
SET is_onboarded = false 
WHERE email = 'test@example.com';

-- Optional: Clear their subjects
DELETE FROM user_subjects 
WHERE user_id = 'user-uuid-here';
```

Or just create new test accounts! 🎉

---

## 📝 **Feedback to Collect**

When testing, note:
1. ⏱️ Search speed (acceptable?)
2. 🎯 Result relevance (accurate?)
3. 🤔 User confusion points (where did they hesitate?)
4. 💡 Missing features (what did they expect?)
5. 🐛 Bugs (what broke?)

---

## ✅ **Ready to Test!**

The wizard is fully functional and ready for user testing. 

**Start a test:**
1. Create new account
2. Go through onboarding
3. Search for topics
4. Complete wizard
5. Check Home screen

**Questions?** Check `TOPIC-SEARCH-STRATEGY.md` for full context.

---

**Last Updated:** November 24, 2025  
**Status:** ✅ Ready for Testing









