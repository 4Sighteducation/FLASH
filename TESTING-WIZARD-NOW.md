# Testing the Wizard - Step by Step
**Status:** API is deploying now  
**Ready in:** ~1-2 minutes

---

## ✅ **Once Deployment Completes:**

### **Test 1: Verify API Works**

Visit: `https://flash-193k1ofuo-tony-dennis-projects.vercel.app/api/search-topics`

**Expected:** Should show "Method not allowed" (means endpoint exists!)

---

### **Test 2: Test the Full Wizard**

**Go to:** `https://www.fl4sh.cards`

1. **Sign Out** (if logged in)

2. **Click "Create Account"**
   - Use NEW email: `test@example.com` (or any unused email)
   - Password: anything you'll remember
   - Click "Sign Up"

3. **Welcome Screen** (3 steps)
   - Click through the welcome tutorial
   - Step 1: "Welcome to FLASH!"
   - Step 2: "How This Works"
   - Step 3: "Let's Get You Set Up"
   - Click "Set My Subjects"

4. **Exam Type Selection**
   - Select: **GCSE**
   - Click "Continue"

5. **Exam Board & Subjects**
   - Choose board: **Edexcel** (or AQA, OCR)
   - Select subject: **Biology (GCSE)**
   - Click "Continue (1 subject selected)"

6. **🆕 First Topic Wizard** (THE NEW FEATURE!)
   - **Step 1: Introduction**
     - Shows explanation and examples
     - Click "Start Searching"
   
   - **Step 2: Search Interface**
     - Type: **"photosynthesis"**
     - Wait 1-2 seconds
     - Should see results appear! ✨
     - Select 1-3 topics (checkbox them)
     - Click "Continue with X topics"
   
   - **Step 3: Add More?**
     - Choose "Start Creating Cards"

7. **Complete Onboarding**
   - See success screen
   - Click "Start Learning"
   - Land on Home screen

---

## 🎯 **What to Look For:**

### **✅ Good Signs:**
- Search returns results in 1-2 seconds
- Results show Biology topics
- Breadcrumbs appear (e.g., "Cells > Plant Biology")
- Exam importance bars show
- Can select multiple topics
- Bottom action bar appears

### **❌ Problem Signs:**
- 404 error in console
- "No topics found" for common searches
- Timeout errors
- API errors

---

## 🐛 **If Something Goes Wrong:**

**Check browser console (F12):**
- Look for red errors
- Copy any error messages

**Common Issues:**
1. **Still getting 404:** API hasn't deployed yet (wait 1 more minute)
2. **401 errors:** Environment variables not set correctly
3. **No results:** Subject name format issue
4. **Timeout:** Supabase connection issue

---

## 📝 **Test Searches:**

Try these to test different topics:

**Biology:**
- "photosynthesis"
- "cell structure"
- "DNA"
- "heart"

**Chemistry (if you added it):**
- "periodic table"
- "chemical bonds"
- "acids"

**Physics (if you added it):**
- "forces"
- "electricity"
- "energy"

---

## 🎉 **Success Criteria:**

The wizard is working if:
- [ ] Can complete full onboarding flow
- [ ] Search returns relevant topics
- [ ] Can select topics
- [ ] No console errors
- [ ] Lands on Home screen after completion

---

**Once deployed, try the test above and let me know what happens!** 🚀

**Current API URL:** https://flash-193k1ofuo-tony-dennis-projects.vercel.app
**Current Web App:** https://www.fl4sh.cards



