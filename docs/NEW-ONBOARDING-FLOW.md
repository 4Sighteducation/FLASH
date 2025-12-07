# New Onboarding & Card Creation Flow
**Date:** December 6, 2025  
**Status:** Implemented  
**Phase:** 1 of 3 Complete

---

## 🎯 Overview

This document outlines the completely rebuilt onboarding and card creation flow for FLASH, focusing on **intelligent, search-driven topic discovery** instead of overwhelming users with pre-built topic lists.

---

## 📋 New User Journey

### **Step 1: Welcome** ✅
**Screen:** `WelcomeScreen.tsx` (unchanged)
- App introduction
- Benefits overview
- "Get Started" CTA

### **Step 2: Select Exam Level** ✅
**Screen:** `ExamTypeSelectionScreen.tsx` (updated navigation)
- Choose: GCSE / A-Level / BTEC / IB / iGCSE
- Clean card-based selection
- **Updated:** Now navigates to `SubjectSearch` instead of old `SubjectSelection`

### **Step 3: Search & Select Subjects** ✅ NEW
**Screen:** `SubjectSearchScreen.tsx` (brand new)

**Features:**
```
┌─────────────────────────────────────────┐
│ 🔍 Type a subject name...               │
├─────────────────────────────────────────┤
│ Search Results:                         │
│                                         │
│ Physics ▼                               │
│  ├─ AQA                                 │
│  ├─ Edexcel            [+]              │
│  ├─ OCR                                 │
│  └─ WJEC                                │
│                                         │
│ Selected (1):                           │
│ ✅ Physics - Edexcel         [×]        │
│                                         │
│ [Continue with 1 subject →]             │
│                                         │
│ 💡 Don't worry, you can add more       │
│    subjects or change exam boards later │
└─────────────────────────────────────────┘
```

**Key UX Features:**
- ✅ Search by subject name (e.g., "Physics", "Biology")
- ✅ Shows ALL exam boards offering that subject
- ✅ Students can select even if unsure of their exam board
- ✅ Reassurance message about changing later
- ✅ Multi-select: add multiple subjects at once
- ✅ Can add just 1 subject and proceed (not forced to complete everything)

**Database Query:**
```sql
SELECT * FROM search_subjects_with_boards('Physics', 'A_LEVEL');
```

Returns grouped subjects with exam board options.

**Saves to:**
```sql
INSERT INTO user_subjects (user_id, subject_id, exam_board)
VALUES (user_id, selected_subject_id, 'Edexcel');
```

### **Step 4: Onboarding Complete** ✅
**Screen:** `OnboardingCompleteScreen.tsx`
- Congratulations message
- "Create Your First Flashcards" CTA
- Navigate to Main app (Home screen)

---

## 🎨 What Was Removed

### ❌ Deleted from Onboarding Flow:
- ~~`FirstTopicWizardScreen.tsx`~~ (removed from onboarding nav)
- ~~`TopicCurationScreen.tsx`~~ (removed from onboarding nav)
- ~~Old `SubjectSelectionScreen.tsx`~~ (replaced with `SubjectSearchScreen`)

**Why Removed:**
- Pre-building topic lists before card creation was overwhelming
- Students don't know what topics they need until they start studying
- New approach: **topics emerge organically from card creation**

---

## 🃏 New Card Creation Flow (Phase 2 - In Progress)

### **Current State:**
The existing card creation probably has:
```
Home → Create Card → Select Topic (hierarchy navigator) → Create Cards
```

### **New Approach:**
```
Home → Create Card → Smart Search → Pick Topics → Generate Cards
```

### **Smart Search Features (To Be Built):**

1. **Context-Aware Search**
   - Uses user's exam board, level, subject automatically
   - No need to re-select metadata
   - Filters topics to user's specific course

2. **Intelligent Suggestions**
   ```
   User searches: "Circulatory System"
   
   Results:
   📍 Double Circulatory System
      Biology > Transport Systems > Heart
      [Create Cards]
   
   📍 Heart Structure  
      Biology > Transport Systems > Heart
      [Create Cards]
   
   💡 Students also create cards for:
   - Blood Vessels
   - Blood Pressure Regulation
   - Cardiac Cycle
   ```

3. **Hierarchy Display**
   - Show breadcrumb: `Biology > Transport Systems > Heart > Double Circulatory System`
   - User understands context without navigating 7 levels
   - Optional: "View full topic tree" button for those who want it

4. **Related Topics (Both Strategies):**
   - **Vector Search:** Similar topics based on embeddings
   - **Hierarchy:** Parent/child relationships
   
   Example:
   ```sql
   -- Vector search for similar topics
   SELECT * FROM match_topics(
     query_embedding,
     'Edexcel',
     'GCSE', 
     'Biology (GCSE)',
     20
   );
   
   -- Hierarchy: Get siblings/children
   SELECT * FROM curriculum_topics
   WHERE parent_topic_id = (
     SELECT parent_topic_id FROM curriculum_topics WHERE id = selected_topic_id
   );
   ```

---

## 🗂️ Topic List Evolution

### **Old Way (Overwhelming):**
```
User signs up → Forced to build full topic list
Biology GCSE:
├─ Cell Biology (23 topics)
├─ Organisation (31 topics)
├─ Infection and Response (18 topics)
├─ Bioenergetics (12 topics)
... (200+ topics total)
```

### **New Way (Organic Growth):**
```
User signs up → Adds subjects → Starts creating cards immediately

Week 1:
└─ Biology GCSE (3 topics)
   ├─ Cell Structure (5 cards)
   ├─ Mitosis (3 cards)
   └─ Osmosis (4 cards)

Week 5:
└─ Biology GCSE (15 topics)
   ├─ Cell Structure (12 cards) ← added more
   ├─ Mitosis (8 cards)
   ├─ Osmosis (6 cards)
   ... (12 more topics from ongoing learning)

Pre-Exam (Week 12):
└─ Biology GCSE (45 topics)
   ├─ All learned topics from term
   └─ Can use "Browse All" to add comprehensive coverage
```

**Benefits:**
- ✅ No overwhelming initial list
- ✅ Mirrors actual learning progression
- ✅ Students add topics as they encounter them in class
- ✅ Still allows "revision mode" via browse option

---

## 📊 Database Changes

### **Existing Tables (No Changes Needed):**
```sql
exam_boards
qualification_types
exam_board_subjects
curriculum_topics
user_subjects ← saves user's subject+board selections
flashcards
```

### **New RPC Function:**
```sql
CREATE FUNCTION search_subjects_with_boards(
  p_search_term TEXT,
  p_qualification_code TEXT
) 
RETURNS TABLE (
  subject_name TEXT,
  qualification_level TEXT,
  exam_board_options JSONB
);
```

This groups subjects by name and provides exam board options.

---

## 🎯 Implementation Phases

### **Phase 1: New Onboarding** ✅ COMPLETE
- [x] Create `SubjectSearchScreen.tsx`
- [x] Create SQL RPC `search_subjects_with_boards`
- [x] Update `AppNavigator.tsx`
- [x] Update `ExamTypeSelectionScreen` navigation
- [x] Remove old topic wizard from onboarding

**New Flow:**
```
Welcome → ExamType → SubjectSearch → OnboardingComplete → Home
```

### **Phase 2: Smart Card Creation** ⏳ NEXT
- [ ] Find/update existing card creation screen
- [ ] Integrate topic search into card creation
- [ ] Add smart suggestions (vector + hierarchy)
- [ ] Show breadcrumb hierarchy
- [ ] Add "Browse All Topics" fallback option
- [ ] Test with real data

### **Phase 3: First-Time Walkthrough** ⏳ FUTURE
- [ ] Update `OnboardingCompleteScreen`
- [ ] Add "Create Your First Flashcard!" prompt
- [ ] Walk user through:
  1. Search for a topic
  2. Select topic
  3. Generate cards (AI)
  4. Review first card
  5. Complete!

---

## 🧪 Testing Checklist

### **Phase 1 Testing:**
- [ ] New user can sign up
- [ ] Can select exam level
- [ ] Can search for subjects (e.g., "Physics")
- [ ] Sees exam board options
- [ ] Can select multiple subjects
- [ ] Subject saves to `user_subjects` table
- [ ] Reaches Home screen after completion
- [ ] Can add more subjects later (test in Profile/Settings)

### **Phase 2 Testing:**
- [ ] User can click "Create Cards"
- [ ] Search interface appears
- [ ] Search uses user's exam board/level/subject automatically
- [ ] Results show breadcrumbs
- [ ] Can select topic and generate cards
- [ ] Cards save correctly
- [ ] Topic appears in user's topic list
- [ ] Suggestions work (vector + hierarchy)

---

## 🚀 Next Steps (What Needs Building)

1. **Immediate (Phase 2 - Week 2):**
   - Find the existing card creation screen
   - Integrate `TopicSearchScreen` into it
   - Wire up smart suggestions
   - Test end-to-end flow

2. **Soon (Phase 3 - Week 3):**
   - Enhanced onboarding complete screen
   - First card walkthrough
   - Metadata management (change exam boards)

3. **Later (Future Enhancements):**
   - "Most popular topics for this exam"
   - Teacher-curated topic lists
   - Shared topic collections between classmates

---

## 💡 Key Design Principles

1. **Search > Browse:** Make search the primary way to find topics
2. **Context is King:** Always use user's metadata (board/level/subject)
3. **Organic Growth:** Topics emerge from usage, not pre-built lists
4. **Flexibility:** Keep browse option for comprehensive coverage
5. **Reassurance:** Tell users they can change/add later
6. **Smart Suggestions:** Help users discover related content

---

## 📝 Files Changed

### **Created:**
- `src/screens/onboarding/SubjectSearchScreen.tsx`
- `supabase/create-subject-search-function.sql`
- `TEST-SUBJECT-SEARCH-QUERIES.sql`
- `docs/NEW-ONBOARDING-FLOW.md` (this file)

### **Modified:**
- `src/navigation/AppNavigator.tsx`
- `src/screens/onboarding/ExamTypeSelectionScreen.tsx`

### **Removed from Nav (still exist in codebase):**
- `FirstTopicWizardScreen.tsx`
- `TopicCurationScreen.tsx`
- Old `SubjectSelectionScreen.tsx`

---

**Document Owner:** Development Team  
**Last Updated:** December 6, 2025  
**Next Review:** After Phase 2 completion
