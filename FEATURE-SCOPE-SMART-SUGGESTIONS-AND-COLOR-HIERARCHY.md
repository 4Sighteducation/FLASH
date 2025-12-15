# Feature Scope: Smart Suggestions + Color Hierarchy

**Date:** December 14, 2025  
**Status:** Scoping / Design Phase  
**Estimated Effort:** 4-6 hours total

---

## 📋 **FEATURE 1: SMART TOPIC SUGGESTIONS**

### Current State

**Location:** `src/screens/topics/SmartTopicDiscoveryScreen.tsx` (Line 353)

**Current Implementation:**
```typescript
{['photosynthesis', 'atoms', 'world war 2', 'quadratic equations'].map((example) => (
  // Hardcoded generic suggestions
))}
```

**Problem:** Generic examples don't relate to the specific course/subject being studied.

---

### Proposed Solution

**Make suggestions course-specific** based on:
1. Subject name (Biology, Chemistry, History, etc.)
2. Exam level (GCSE, A-Level)
3. Popular topics in that subject
4. User's recent searches (already tracking)

#### Implementation Options:

**Option A: Frontend Logic (Simplest - 30 min)**
- Create a mapping object: `subjectExamples[subjectName][examType]`
- No SQL needed
- Manually curated examples per subject

```typescript
const SUBJECT_EXAMPLES = {
  'Biology': {
    'GCSE': ['cell division', 'photosynthesis', 'digestive system', 'genetics'],
    'A-Level': ['protein synthesis', 'homeostasis', 'genetic code', 'enzymes']
  },
  'Chemistry': {
    'GCSE': ['periodic table', 'chemical bonds', 'acids and bases', 'reactions'],
    'A-Level': ['organic chemistry', 'equilibrium', 'thermodynamics', 'kinetics']
  },
  'History': {
    'GCSE': ['world war 2', 'cold war', 'industrial revolution', 'civil rights'],
    'A-Level': ['tudors', 'russian revolution', 'nazi germany', 'vietnam war']
  },
  // etc...
};
```

**Option B: Database-Driven (Smarter - 2 hours)**
- Query top N most popular topics per subject
- Based on actual curriculum data
- SQL: Get topics with highest `exam_importance` OR most flashcards created
- Dynamic, always relevant

```sql
-- Get top suggestions for a subject
SELECT 
  topic_name,
  exam_importance,
  COUNT(flashcard_id) as card_count
FROM curriculum_topics ct
LEFT JOIN flashcards f ON f.topic_id = ct.topic_id
WHERE ct.subject_name = 'Biology'
  AND ct.qualification_level = 'GCSE'
  AND ct.topic_level >= 3  -- Specific enough
ORDER BY exam_importance DESC, card_count DESC
LIMIT 4;
```

**Option C: Hybrid (Best - 1 hour)**
- Fallback frontend mapping for new subjects
- Database query for popular topics
- Mix of curated + dynamic

---

### Recommendation: **Option A (Frontend)**

**Why:**
- Fastest to implement (30 minutes)
- No SQL changes needed
- Fully controllable
- Can always upgrade to Option C later

**Downsides:**
- Manual maintenance per subject
- Not dynamic

**SQL Required:** ❌ None

---

## 🎨 **FEATURE 2: COLOR-CODED HIERARCHY**

### Current State

**Location:** `src/screens/subjects/SubjectProgressScreen.tsx`

**Subject Color:**
- Already exists: `subjectColor` passed via route params (Line 76)
- Currently used for: badges, buttons, UI accents
- Example in your image: Royal Blue `#4169E1`

**Hierarchy Display:**
- Level 0 (Exam papers): Cell biology, Homeostasis, Organisation
- Level 1 (Main topics): Sub-topics under each
- All topics currently use same styling (no color differentiation)

---

### Proposed Solution

**Create a color palette generator** that:
1. Takes parent subject color
2. Generates shades for each hierarchy level
3. Subtle shifts for visual distinction
4. Memory association through consistent colors

#### Technical Approach:

**Color Palette Generation Algorithm:**

```typescript
// Generate color palette from base color
function generateHierarchyPalette(baseColor: string): {
  level0: string[];  // Parent variations
  level1: string[];  // Child variations
  level2: string[];  // Grandchild variations
} {
  const base = hexToHSL(baseColor); // Convert to HSL for manipulation
  
  return {
    // Level 0: Variations of base (adjust lightness)
    level0: [
      hslToHex(base.h, base.s, base.l), // Original
      hslToHex(base.h, base.s, base.l + 5), // Slightly lighter
      hslToHex(base.h, base.s, base.l + 10),
      hslToHex(base.h, base.s, base.l - 5), // Slightly darker
      hslToHex(base.h, base.s, base.l - 10),
    ],
    
    // Level 1: Shift hue slightly (± 10-20 degrees)
    level1: [
      hslToHex(base.h + 10, base.s, base.l),
      hslToHex(base.h - 10, base.s, base.l),
      hslToHex(base.h + 15, base.s, base.l + 5),
      hslToHex(base.h - 15, base.s, base.l + 5),
    ],
    
    // Level 2: Further variations
    level2: [
      hslToHex(base.h + 5, base.s - 10, base.l),
      hslToHex(base.h - 5, base.s - 10, base.l),
      hslToHex(base.h + 8, base.s - 5, base.l + 5),
      hslToHex(base.h - 8, base.s - 5, base.l + 5),
    ],
  };
}
```

**Application Strategy:**

```typescript
// In SubjectProgressScreen.tsx
const colorPalette = generateHierarchyPalette(subjectColor);

// When rendering topics:
groupedTopics.map((group, index) => {
  const level0Color = colorPalette.level0[index % colorPalette.level0.length];
  
  // Render Level 0 with this color
  group.topics.map((topic, childIndex) => {
    const level1Color = colorPalette.level1[childIndex % colorPalette.level1.length];
    // Render child with level1Color
  });
});
```

---

### Visual Example (Royal Blue Base):

**Base Color:** `#4169E1` (Royal Blue)

**Generated Palette:**
- **Level 0 Topics:**
  - Cell biology: `#4169E1` (original)
  - Homeostasis: `#5179F1` (lighter)
  - Organisation: `#3159D1` (darker)

- **Level 1 Sub-topics (under Cell biology):**
  - Mitosis: `#4169E1` → `#5169E1` (hue +10°)
  - Cell structure: `#4169E1` → `#3169E1` (hue -10°)
  - Cell transport: `#4169E1` → `#5179E1` (hue +10°, lighter)

**Result:** 
- Visually related (all in blue family)
- Subtly distinguishable (different shades)
- Memory aid (colors become associated with topics)

---

### Implementation Details:

#### Files to Modify:

1. **Create utility:** `src/utils/colorPaletteGenerator.ts` (NEW)
   - Color conversion functions (hex ↔ HSL)
   - Palette generation algorithm
   - ~150 lines

2. **Modify:** `src/screens/subjects/SubjectProgressScreen.tsx`
   - Import palette generator
   - Apply colors to hierarchy groups
   - ~30 lines changed

#### Where Colors Apply:

```typescript
// Current (all use subjectColor):
<View style={{ backgroundColor: subjectColor }}>

// New (each uses unique shade):
<View style={{ backgroundColor: level0Colors[index] }}>
  <View style={{ backgroundColor: level1Colors[childIndex] }}>
    <View style={{ backgroundColor: level2Colors[grandchildIndex] }}>
```

**Apply colors to:**
- ✅ Left border accent (currently cyan)
- ✅ Topic header background (subtle tint)
- ✅ Collapse/expand icon
- ✅ Card count badge
- ❌ Text (keep white for readability)

---

### SQL Changes Required?

**Answer: ❌ NO**

**Why:**
- Colors generated dynamically on frontend
- Based on existing `subjectColor` prop
- Deterministic algorithm (same input = same output)
- No need to store in database

**Optional Enhancement:**
Could store user's selected subject colors in `user_subjects` table if we want custom colors, but not required for MVP.

---

## 🎯 **IMPLEMENTATION PLAN**

### Phase 1: Smart Suggestions (30 min)

**Tasks:**
1. Create `SUBJECT_EXAMPLES` mapping object
2. Replace hardcoded array with dynamic lookup
3. Add fallback to generic examples
4. Test with multiple subjects

**Files:**
- `src/screens/topics/SmartTopicDiscoveryScreen.tsx`

**Commits:** 1

---

### Phase 2: Color Palette Generator (2 hours)

**Tasks:**
1. Create `colorPaletteGenerator.ts` utility
2. Implement HSL conversion functions
3. Implement palette generation algorithm
4. Write tests for color generation

**Files:**
- `src/utils/colorPaletteGenerator.ts` (NEW)

**Commits:** 1

---

### Phase 3: Apply Color Hierarchy (1.5 hours)

**Tasks:**
1. Import palette generator in SubjectProgressScreen
2. Generate palette from subject color
3. Map colors to hierarchy levels
4. Apply colors to UI elements
5. Test with different subject colors
6. Adjust algorithm if needed

**Files:**
- `src/screens/subjects/SubjectProgressScreen.tsx`

**Commits:** 1-2

---

### Phase 4: Polish & Testing (30 min)

**Tasks:**
1. Test with all subjects (Biology, History, Maths, etc.)
2. Verify color contrast for readability
3. Ensure accessibility standards met
4. User testing for visual distinction

**Commits:** 1

---

## 📊 **EFFORT ESTIMATE**

| Task | Time | Difficulty |
|------|------|------------|
| Smart Suggestions | 30 min | Easy |
| Color Utility | 2 hours | Medium |
| Apply Colors | 1.5 hours | Medium |
| Testing & Polish | 30 min | Easy |
| **TOTAL** | **4.5 hours** | **Medium** |

---

## 🎨 **DESIGN CONSIDERATIONS**

### Color Accessibility:

**Must ensure:**
- Sufficient contrast for text (WCAG AA: 4.5:1 minimum)
- Distinguishable for color-blind users
- Not too subtle (5-10% lightness change minimum)
- Not too dramatic (keeps visual harmony)

**Solution:**
- Keep text white/light gray (high contrast)
- Use colors only for backgrounds/accents
- Test with color-blindness simulators

### Memory Association Psychology:

**Research shows:**
- Color coding improves recall by 55-78%
- Subtle variations work better than dramatic shifts
- Consistent color families create mental models
- Works best with 3-7 distinct shades

**Our Approach:**
- 5 Level 0 variations (Cell biology, Homeostasis, etc.)
- 4 Level 1 variations per parent
- Related through hue/saturation families

---

## 🚀 **NEXT STEPS**

### Option 1: Build Both Features (4.5 hours)
**Pros:** Complete solution, maximum value  
**Cons:** Longer session

### Option 2: Build Smart Suggestions First (30 min)
**Pros:** Quick win, immediate value  
**Cons:** Leaves color hierarchy for later

### Option 3: Build Color Hierarchy First (3.5 hours)
**Pros:** More impressive visual impact  
**Cons:** Takes longer

---

## 💬 **RECOMMENDATION**

**Build Smart Suggestions first (30 min)**, then decide:
- If you have time/energy: Continue with color hierarchy
- If not: Schedule color hierarchy for next session

**Rationale:**
1. Quick win builds momentum
2. Smart suggestions immediately useful
3. Color hierarchy requires more testing
4. Can be built independently

---

## ❓ **QUESTIONS FOR YOU**

### Smart Suggestions:
1. **Which subjects do you want covered?** (Biology, Chemistry, Physics, History, Maths, English, etc.)
2. **How many examples per subject?** (Currently 4, good number?)
3. **Different suggestions per exam level?** (GCSE vs A-Level)

### Color Hierarchy:
1. **How subtle should color shifts be?** (5%, 10%, 15% lightness change?)
2. **Should users customize colors?** (Pick their own subject colors?)
3. **Apply to all hierarchy levels?** (Level 0-4 or just 0-2?)

---

**Ready to proceed?** Let me know which feature to build first! 🚀
