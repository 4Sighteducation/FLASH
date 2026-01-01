# 🐛 ISSUES TO FIX - Next Session

**Date:** December 10, 2025  
**Status:** Identified during testing after major deployment  

---

## 🔴 **CRITICAL ISSUES:**

### **1. Card Slideshow Rendering Backwards**
**Problem:** Cards in Browse & Flip mode show upside down/mirrored  
**File:** `src/components/CardSlideshowModal.tsx`  
**Fix:** Check flip animation rotation direction  
**Priority:** HIGH (breaks user experience)

### **2. Database Errors - user_topic_priorities**
**Errors from logs:**
```
406 (Not Acceptable) on SELECT
409 (Conflict) on INSERT x7
```

**Possible causes:**
- Missing `updated_at` column trigger
- Schema mismatch
- RLS policy blocking access

**Investigation needed:**
```sql
-- Check table structure
\d user_topic_priorities

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_topic_priorities';

-- Test insert
INSERT INTO user_topic_priorities (user_id, topic_id, priority, updated_at)
VALUES ('test-id', 'test-topic', 1, NOW());
```

**Priority:** HIGH (breaks priority feature)

---

## 🟡 **MEDIUM PRIORITY:**

### **3. Navigation After Card Creation**
**Problem:** After generating cards, user must manually click back 3-4 times  
**Expected:** Auto-navigate to subject homepage with new cards  
**File:** `src/screens/cards/AIGeneratorScreen.tsx`  
**Fix:** Add `navigation.navigate('SubjectProgress', { subjectId, ... })` after save  
**Priority:** MEDIUM (annoying but workaround exists)

### **4. Study Modal Old Version**
**Problem:** Clicking "Study (Leitner)" from ManageTopic shows old UI  
**Possible cause:** Caching or different StudyModal being imported  
**Fix:** Verify correct import, check navigation params  
**Priority:** MEDIUM (might be browser cache)

### **5. Card Styling in Browse Mode**
**Request:** Use same card design as study mode, but different theme color  
**File:** `src/components/CardSlideshowModal.tsx`  
**Fix:** Import FlashcardCard component, add theme color prop  
**Priority:** MEDIUM (cosmetic improvement)

---

## 🟢 **LOW PRIORITY:**

### **6. Level 2 Topic Creation**
**Issue:** Users can create cards for Level 2 (organizational headers)  
**Should:** Show Level 3 subtopic selector instead  
**Fix:** Detect Level 2 in discovery, show subtopic modal  
**Priority:** LOW (can implement later)

### **7. AI Context for Level 4-7**
**Issue:** AI doesn't know about Level 4-7 subtopics when generating  
**Should:** Fetch children and include in prompt context  
**Fix:** Update AI generation to always fetch children  
**Priority:** LOW (enhancement)

---

## 🔧 **QUICK FIXES (30 min each):**

### **Fix 1: Card Slideshow Backwards**
- Check `frontInterpolate` and `backInterpolate` in CardSlideshowModal
- Might need to swap '0deg'/'180deg' values
- Or use FlashcardCard component instead

### **Fix 2: Database Errors**
```sql
-- Add updated_at trigger if missing
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_topic_priorities
DROP TRIGGER IF EXISTS update_user_topic_priorities_updated_at ON user_topic_priorities;
CREATE TRIGGER update_user_topic_priorities_updated_at 
    BEFORE UPDATE ON user_topic_priorities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_topic_priorities TO authenticated;
```

### **Fix 3: Auto-Navigate After Save**
```typescript
// In AIGeneratorScreen.tsx after save
const handleSaveComplete = () => {
  // Navigate back to subject screen
  navigation.navigate('SubjectProgress', {
    subjectId,
    subjectName,
    subjectColor,
    examBoard,
    examType,
  });
};
```

---

## 📋 **TESTING CHECKLIST FOR TOMORROW:**

- [ ] Card slideshow flips correctly (not backwards)
- [ ] Priority saving works (no 406/409 errors)
- [ ] After generating cards → Auto-navigate to homepage
- [ ] Study modal shows correct version
- [ ] Browse mode uses same card design
- [ ] All buttons functional
- [ ] No console errors

---

## 🎯 **SESSION SUMMARY:**

**Today:** Built complete progressive discovery + management system  
**Tomorrow:** Fix bugs found in testing, polish UX  
**Then:** Production launch! 🚀

---

**Estimated fix time:** 2-3 hours tomorrow morning  
**Then:** Full testing and launch prep!





