# Topic Search & Discovery Strategy
**Date:** November 24, 2025  
**Status:** In Development (Phase 1)  
**Context:** Post-embedding generation, building UI/UX for search

---

## 📋 Executive Summary

This document outlines the strategic approach to implementing AI-powered topic search in FLASH, solving the critical UX problem of helping students quickly find and add specific curriculum topics without navigating through deep hierarchies.

**Key Insight:** Students use the app in two natural, interchangeable ways:
1. **Active Learning** - Adding specific topics as they learn in class ("circulatory system")
2. **Pre-Exam Preparation** - Quickly building comprehensive topic coverage

Rather than forcing users into distinct "modes," we're building a flexible discovery system that naturally responds to both behaviors.

---

## 🎯 The Problem We're Solving

### **Current User Pain Point**

To add a specific Level 3/4 topic, users must navigate through multiple hierarchy levels:

```
Physical Education
└─ Component 1 - Physical Fitness
   └─ Health Training and Exercise
      └─ Exercise Physiology
         └─ Cardio-respiratory Systems
            └─ Functions of Cardio System
               └─ Double Circulatory System ← What they actually want
```

**Result:** 7+ clicks just to add one topic. This doesn't scale when students need dozens of topics.

### **The Real-World Usage Pattern**

**Scenario 1: Active Learner**
> Student studying Biology, currently learning about heart structure in class. Opens app, types "double circulatory system," wants to create flashcards immediately.

**Problem:** Can't search - must navigate entire tree.

**Scenario 2: Pre-Exam Rush**
> Student has exam in 3 weeks, needs to quickly add 20-30 topics across multiple subjects. Current tree navigation would take 30+ minutes.

**Problem:** Too time-consuming to be practical.

---

## 💡 Strategic Insights

### **Insight 1: Not "Modes" - Natural Behaviors**

Initial thinking categorized users into two modes:
- ❌ "Active Learning Mode" 
- ❌ "Revision Mode"

**Realization:** These aren't different user types or modes - they're contexts the SAME user experiences at different times.

**Example user journey:**
```
Week 1-10: Adds topics organically as they learn
Week 11: Stops using app
Week 3 before exam: Returns, needs quick comprehensive coverage
Week after exam: Back to organic learning pattern
```

**Design Implication:** Don't force mode selection. Build flexible tools that work for both contexts naturally.

### **Insight 2: The Hierarchy Problem**

The curriculum has necessary hierarchical structure:
```
Level 1: Modules (broad areas)
Level 2: Topics (major concepts)
Level 3: Sub-topics (specific content)
Level 4: Detail level
```

**The dilemma:** How do we let users add specific Level 3/4 topics without creating the entire parent hierarchy?

**Solutions Explored:**

**Option A: Flat Structure with Breadcrumbs** ⭐ (CHOSEN)
```
My Topics - Biology:
─────────────────────────────────
📍 Double Circulatory System
   Cardio-respiratory > Functions
   [5 cards] [+Add Cards]

📍 Biomechanics  
   Component 1 > Movement Analysis
   [0 cards] [+Add Cards]
```

**Pros:**
- Clean, uncluttered
- Shows context without forcing hierarchy
- Fast to add specific topics
- Can "zoom out" to see full tree if needed

**Option B: Smart Parent Shells**
- Create "ghost" parent nodes automatically
- Keep parents collapsed/hidden
- Only show what user explicitly added

**Option C: Always require full hierarchy**
- ❌ Rejected: Too cumbersome

**Decision:** Option A with breadcrumbs provides best balance of speed and context.

### **Insight 3: The "Card Bank" Mental Model**

Emerged from discussion: FLASH has two distinct spaces:

**1. The Card Bank (Discovery)**
- All available curriculum topics (54,942 topics)
- Search and browse capabilities
- Filtered by user's exam board/level/subjects
- Like a "store" of available content

**2. My Active Topics (Study)**
- Topics user has actually added cards to
- Personalized, curated list
- Where studying happens
- Shows progress (cards in boxes, due dates)

**Analogy:** 
- Card Bank = Amazon product catalog
- My Topics = Your shopping cart / purchased items

**UI Implication:** These should be separate screens/tabs with different purposes.

---

## 🏗️ Technical Foundation

### **What's Already Built**

✅ **Database Layer:**
- 54,942 topics with AI embeddings
- Vector search function (`match_topics`)
- Supabase + pgvector infrastructure
- Search performs in 200-1000ms with context filtering

✅ **Existing UI:**
- Subject selection (onboarding working)
- Hierarchical topic browser (`CardTopicSelector`)
- Topic priorities system (`TopicHubScreen`)
- Card creation flow (AI + manual)
- Home screen with subject cards

✅ **Key Components:**
- `CardSubjectSelector` - Choose which subject
- `CardTopicSelector` - Navigate hierarchy tree
- Card creation screens
- Study interface with Leitner system

### **What Needs Building**

🔨 **New Components:**
- `TopicSearchScreen` - Search-first interface
- Search results display with breadcrumbs
- Subject filter tabs
- "Card Bank" concept screens

🔨 **Updates Required:**
- `CardSubjectSelector` - Add [Search | Browse] choice
- Navigation structure - Wire up new screens
- `useUserProfile` hook - Fetch user context for filtering

### **Critical Search Requirements**

Based on testing documented in `HANDOVER-SEARCH-IMPLEMENTATION.md`:

**1. Context Filtering is MANDATORY**
```javascript
// NEVER do this (timeouts):
searchTopics(query);

// ALWAYS do this:
searchTopics(query, {
  exam_board: 'Edexcel',
  qualification_level: 'GCSE', 
  subject_name: 'Biology (GCSE)' // Note: includes qualification!
});
```

**2. Subject Name Format**
Database stores subjects as: `"Biology (GCSE)"` not `"Biology"`

Must format correctly:
```javascript
formatSubjectForSearch('Biology', 'GCSE') // → "Biology (GCSE)"
```

**3. Search Performance**
- With context: 200-1000ms ✅
- Without context: Timeout ❌
- Optimal result count: 15-20 (low confidence scores mean show more)

**4. Low Relevance Workaround**
Current embeddings generated from summaries only (not topic names), resulting in 1-5% confidence scores.

**Solutions:**
- Show 15-20 results instead of 5-10
- Add keyword highlighting
- Provide "Browse" fallback
- **Future:** Regenerate embeddings with topic names included

---

## 📐 Implementation Strategy

### **Approach: Incremental Update (NOT Rebuild)**

**Why Incremental:**
- ✅ Lower risk - existing functionality stays working
- ✅ Can ship improvements weekly
- ✅ Test each change independently
- ✅ Users can continue testing current version
- ✅ Keep momentum vs. big-bang rebuild

**Why NOT Rebuild:**
- ❌ Would break working onboarding/card creation
- ❌ Higher risk of introducing bugs
- ❌ Loses months of testing/refinement
- ❌ Have to re-test everything

### **Three-Phase Rollout**

#### **PHASE 1: Add Search Layer (Week 1)** 🔍
**Goal:** Get search working alongside existing browse

**Deliverables:**
1. New `TopicSearchScreen` component
2. Updated `CardSubjectSelector` with [Search | Browse] choice
3. Wire search into existing card creation flow
4. Keep `CardTopicSelector` (hierarchy) unchanged

**Navigation After Phase 1:**
```
Create Card 
  → Choose Subject
  → [🔍 Search | 📁 Browse] ← NEW CHOICE
       ↓              ↓
   Search Screen   Existing Tree
   (new)          (untouched)
  → Create Cards (existing flow)
```

**Success Criteria:**
- Can search "circulatory system" and find results
- Can still browse full hierarchy tree
- Both paths lead to card creation
- No existing functionality broken

**Files to Create:**
- `src/screens/topics/TopicSearchScreen.tsx`
- `src/components/TopicSearchResults.tsx`
- `src/hooks/useUserProfile.ts` ✅ (already created)

**Files to Update:**
- `src/screens/cards/CardSubjectSelector.tsx` (add choice buttons)
- `src/navigation/MainNavigator.tsx` (add route)
- `src/hooks/useTopicSearch.ts` (already exists, may need tweaks)

**What NOT to Touch:**
- `HomeScreen.tsx` (keep as is)
- `CardTopicSelector.tsx` (don't change hierarchy browser)
- `TopicHubScreen.tsx` (priorities - working fine)
- Onboarding flow (working)
- Card creation screens (working)

---

#### **PHASE 2: Card Bank Concept (Week 2)** 🏦
**Goal:** Separate discovery from active study

**Deliverables:**
1. New "Topics" tab in bottom navigation
2. Unified `TopicBankScreen` (search + browse combined)
3. Updated Home screen showing "My Active Topics"
4. Clear distinction: Bank (discover) vs. My Topics (study)

**New Navigation Structure:**
```
Bottom Tabs:
┌────────┬────────┬────────┬─────────┐
│ Home   │ Topics │ Study  │ Profile │
└────────┴────────┴────────┴─────────┘
   ↓         ↓
My Active  Card Bank
Topics     (discover)
```

**Home Tab (Refocused):**
- Shows topics user has cards for
- Study progress, due cards
- Quick access to active subjects
- "Find More Topics" → goes to Topics tab

**Topics Tab (NEW - Card Bank):**
- Search bar always visible
- Subject filter tabs
- Combined search + browse interface
- "Add to My Topics" → Create Cards

**Success Criteria:**
- Clear mental model: Bank vs. My Topics
- Easy to discover new topics
- Easy to see what you're actively studying
- Smooth flow from discovery to card creation

---

#### **PHASE 3: UI Modernization (Week 3-4)** 🎨
**Goal:** Update visual design screen-by-screen

**Priority Order:**
1. Topics tab (new, set design standard)
2. Search results screen
3. Home screen subject cards
4. Card creation screens
5. Study interface

**Design System:**
- Neon/cyber theme: `#FF006E` (pink), `#00F5FF` (cyan)
- Dark backgrounds (`#000`, `#0A0A0A`)
- Animated gradients
- Glowing borders on focus
- Breadcrumb trails for topic context

**What to Update:**
- Color schemes
- Typography
- Spacing/padding
- Animations
- Button styles
- Card layouts

**What to Keep:**
- Navigation structure
- Information hierarchy
- User flows
- Existing functionality

---

## 🎨 UI/UX Design Decisions

### **Search Interface**

**Primary Components:**
```
┌─────────────────────────────────────┐
│ 🔍 Search topics...                 │ ← Animated neon border on focus
├─────────────────────────────────────┤
│ [Bio] [Chem] [PE]                   │ ← Subject tabs (if multiple subjects)
├─────────────────────────────────────┤
│ Results:                            │
│                                     │
│ 📍 Double Circulatory System       │
│    Cardio-respiratory > Functions   │ ← Breadcrumb
│    85% exam importance              │
│    [+ Add]                          │
│                                     │
│ 📍 Heart Structure                  │
│    Anatomy > Cardiac Systems        │
│    92% exam importance              │
│    [+ Add]                          │
│                                     │
│ [Browse all Biology topics]         │ ← Fallback to hierarchy
└─────────────────────────────────────┘
```

**Key Features:**
- Real-time search (debounced 500ms)
- Shows 15-20 results (due to low confidence)
- Breadcrumb shows topic context
- Exam importance indicator
- Quick "Add" action
- Browse fallback always available

### **Browse Interface (Existing)**

Keep current `CardTopicSelector` as is:
- Collapsible hierarchy tree
- Color-coded by depth
- Indented visualization
- Only leaf nodes selectable

This works perfectly for "revision mode" comprehensive coverage.

### **Topic Display with Breadcrumbs**

When topic is added to "My Topics":
```
┌─────────────────────────────────────┐
│ Biology - My Topics                 │
├─────────────────────────────────────┤
│                                     │
│ 📍 Double Circulatory System       │
│    Cardio-respiratory > Functions   │ ← Breadcrumb
│    [5 cards] [Box 3] [+Add Cards]   │
│                                     │
│ 📍 Photosynthesis                   │
│    Plant Biology > Cell Processes   │
│    [8 cards] [Box 4] [+Add Cards]   │
│                                     │
└─────────────────────────────────────┘
```

**NOT like this (forced hierarchy):**
```
❌ Biology
   └─ Cardio-respiratory Systems
      └─ Functions
         └─ Double Circulatory System
```

---

## 🔄 User Flows

### **Flow A: Active Learning (Specific Topic)**

```
1. Student learning about circulatory system in class
   ↓
2. Opens FLASH → Click "Create Card"
   ↓
3. Select Subject: Biology
   ↓
4. Choose: [🔍 Search] (not Browse)
   ↓
5. Type: "double circulatory"
   ↓
6. See results with breadcrumbs
   ↓
7. Tap result → Goes to card creation
   ↓
8. Create 3-5 cards
   ↓
9. Topic now in "My Active Topics"
```

**Time to first card:** ~30 seconds (vs. 3+ minutes with hierarchy navigation)

### **Flow B: Pre-Exam Preparation (Comprehensive)**

```
1. Student has exam in 3 weeks, needs broad coverage
   ↓
2. Opens FLASH → Goes to Topics tab (Card Bank)
   ↓
3. Select Subject: Biology
   ↓
4. Choose: [📁 Browse] (not Search)
   ↓
5. See Level 1 modules, expand interesting ones
   ↓
6. Bulk select 15-20 topics
   ↓
7. Click "Create Cards" → Batch card generation
   ↓
8. All topics now in "My Active Topics"
```

**Time to add 20 topics:** ~5 minutes (vs. 30+ minutes clicking through each)

### **Flow C: Mixed Usage (Most Common)**

```
Week 1-5: Uses Search for specific topics as they learn
Week 6: Exam announced - switches to Browse, adds comprehensive coverage
Week 7-8: Back to Search for problem areas
Week 9: Exam week - uses existing cards
```

**The system adapts naturally** - no forced mode selection.

---

## 📊 Success Metrics

### **Phase 1 Success:**
- [ ] Can search and find topics in <5 seconds
- [ ] Search → card creation flow works end-to-end
- [ ] Hierarchy browse still functions
- [ ] No bugs in existing flows
- [ ] User feedback: "Faster to add topics"

### **Phase 2 Success:**
- [ ] Clear distinction between Card Bank and My Topics
- [ ] Users understand two-space model
- [ ] Topics tab becomes primary discovery method
- [ ] Home screen focuses on active study

### **Phase 3 Success:**
- [ ] Consistent neon/cyber theme across app
- [ ] Smooth animations and transitions
- [ ] Professional, polished feel
- [ ] User feedback: "Looks modern"

### **Overall Success:**
- [ ] Average time to add topic: <1 minute (from 3+ minutes)
- [ ] Users add more topics per session
- [ ] Search used more than browse for specific topics
- [ ] Browse used for comprehensive coverage
- [ ] No increase in support questions

---

## 🚨 Known Issues & Workarounds

### **Issue 1: Low Search Relevance (1-5%)**

**Problem:** Embeddings generated from AI summaries only, not topic names.

**Current Workaround:**
- Show 15-20 results instead of 5-10
- Add keyword highlighting
- Provide browse fallback
- Accept lower confidence scores

**Permanent Fix (Future):**
Regenerate embeddings with richer text:
```javascript
const textToEmbed = `
  Topic: ${topic.topic_name}
  Code: ${topic.topic_code}
  Path: ${topic.full_path.join(' > ')}
  Summary: ${summary}
`;
```

**Cost to fix:** ~$1.70 to regenerate all embeddings  
**Priority:** Medium (after Phase 3)

### **Issue 2: Subject Name Format**

**Problem:** Database uses `"Biology (GCSE)"` not `"Biology"`

**Solution:** Format helper function
```javascript
formatSubjectForSearch(subjectName, qualificationLevel)
```

Already implemented in `useUserProfile.ts`

### **Issue 3: Search Without Context = Timeout**

**Problem:** Searching 54k topics without filters times out

**Solution:** ALWAYS include user context filters:
- exam_board
- qualification_level  
- subject_name

This is enforced in `useTopicSearch` hook.

---

## 🔮 Future Enhancements

### **After Phase 3:**

**1. Related Topics Suggestions**
When user adds "Double Circulatory System," suggest:
- Heart Structure
- Blood Vessels
- Blood Pressure Regulation

**2. Smart Topic List Generator**
AI generates optimal topic list based on:
- Time until exam
- User's current coverage
- Exam specification emphasis
- Past paper frequency

**3. Topic Progress Tracking**
Visual indicators:
- % of recommended topics added
- Coverage by module
- Weak areas identification

**4. Search Quality Improvements**
- Regenerate embeddings with topic names
- Add keyword search as parallel option
- Fine-tune on curriculum data
- User feedback loop ("Was this helpful?")

**5. Collaborative Features**
- Share topic lists with classmates
- "Most studied topics" for each exam
- Teacher-curated topic collections

---

## 📝 Key Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Nov 24 | Use breadcrumbs instead of forced hierarchy | Faster topic addition, cleaner UI |
| Nov 24 | Incremental update vs. rebuild | Lower risk, maintain working features |
| Nov 24 | Three-phase rollout | Ship improvements weekly, test iteratively |
| Nov 24 | Keep existing hierarchy browser | Works well for comprehensive coverage |
| Nov 24 | Add "Topics" tab (Card Bank) | Clear mental model for discovery vs. study |
| Nov 24 | Phase 1 first, UI polish later | Functionality before aesthetics |

---

## 🎯 Current Status

**Phase:** Phase 1 - Add Search Layer  
**Started:** November 24, 2025  
**Next Milestone:** Complete search screen and integration  
**Blockers:** None  
**Risk Level:** Low (incremental approach)

---

## 📚 Related Documentation

- `HANDOVER-SEARCH-IMPLEMENTATION.md` - Technical search implementation details
- `WEEK-1-2-TECHNICAL-SPEC-CORRECTED.md` - Database and embedding setup
- `TOPIC-DATA-LIFECYCLE.md` - How topic data flows through the system
- `CONTEXTUAL-SEARCH-UI-GUIDE.md` - UI patterns for contextual search

---

**Document Owner:** Development Team  
**Last Updated:** November 24, 2025  
**Next Review:** After Phase 1 completion









