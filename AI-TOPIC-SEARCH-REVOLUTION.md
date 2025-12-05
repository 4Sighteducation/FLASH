# AI-Assisted Topic Search Revolution

**Date:** November 21, 2025  
**Status:** Vision Document & Implementation Plan  
**Problem:** Too much depth in curriculum data (up to 6 levels) to display as simple lists

---

## 📊 CURRENT STATE ANALYSIS

### Database Progress
**Staging Database: ~75% Complete**
- **Edexcel A-Level:** 33/37 subjects (89%) - ~5,000+ topics
- **Edexcel GCSE:** 28/35 subjects (80%) - ~1,065+ topics
- **Total:** ~10,000+ topics, ~850+ paper sets
- **Hierarchy Depth:** 3-6 levels depending on subject

### Current Topic Selection Flow (Problems)
```
User Flow Today:
1. Select Exam Type (GCSE, A-Level)
2. Select Exam Board (AQA, Edexcel, etc.)
3. Select Subjects
4. Open TopicCurationScreen → TopicEditModal
5. See hierarchical list of ALL topics
❌ PROBLEM: With 600+ topics in Business (5 levels), this is overwhelming!
```

**Current UI Files:**
- `SubjectSelectionScreen.tsx` - Works well, clean UI
- `TopicCurationScreen.tsx` - Opens modal for each subject
- `TopicSelectorScreen.tsx` - Shows hierarchical topic list (only top-level)
- **Problem:** Only shows Level 0 topics, deeper levels hidden

**Example of Overwhelming Depth:**
```
Business (9BS0): 613 topics across 5 levels
Economics A: 663 topics across 5 levels
History: Multiple options with complex selection rules
Languages: 4-6 themes with grammar categories

Current UI can't handle this elegantly!
```

---

## 💡 YOUR REVOLUTIONARY VISION (Unpicked)

### Core Problem Identified
> "The scrape has revealed so much depth that there is just simply too much to display flashcard lists."

**Your Insight:** 
- ✅ Deep hierarchies are PERFECT for AI understanding
- ❌ Deep hierarchies are TERRIBLE for user browsing
- ✅ Solution: AI acts as intelligent guide, not dumb list

---

## 🎯 THE NEW PARADIGM: AI-ASSISTED DISCOVERY

### Concept: "Conversational Topic Discovery"

Instead of:
```
❌ OLD WAY:
User sees: 
  - Theme 1: Marketing (click)
    - 1.1 Customer Needs (click)
      - 1.1.1 Markets (click)
        - a) Mass vs Niche (click)
          - [Finally select this]
          
Problem: 5 clicks, cognitive overload, no context
```

New Way:
```
✅ NEW WAY:
AI: "What are you studying right now?"
User: "marketing and customers"

AI: "Great! I found topics on:
     • Understanding customer needs
     • Market segmentation 
     • Customer behavior
     
     Want to zoom in on any of these?"
     
User: "customer needs"

AI: "Perfect! Let's create flashcards on:
     • Mass markets vs niche markets
     • Market size and share
     • Dynamic markets
     
    [Difficulty Slider: Basic → Advanced]
    [Generate 20 cards]"
```

---

## 🔍 KEY FEATURES BREAKDOWN

### 1. **AI-Assisted Search Function**
**What it does:**
- Natural language search: "I'm studying photosynthesis" → finds Biology topics
- Semantic matching: "World War 2" → finds relevant History options
- Exam board agnostic initially: Discovers what user needs first

**Why it's brilliant:**
- Students don't always know their exam board code
- They know what they're studying TODAY
- AI narrows down: Board → Subject → Topic depth

**Technical Approach:**
```typescript
// AI Service
interface TopicSearchQuery {
  userInput: string;
  examBoard?: string;
  subject?: string;
  currentDepth?: number;
}

async function intelligentTopicSearch(query: TopicSearchQuery) {
  // Use Claude/GPT with vector search on topic names
  // Consider full hierarchy for context
  // Return top 5-10 relevant topics with breadcrumbs
}
```

---

### 2. **Guided Questions to Narrow Down**

**The Discovery Flow:**
```
Step 1: "What subject are you studying?"
User: "History" or types "French Revolution"

Step 2: "Which exam board?" 
(Only if ambiguous)
AI shows: "I found this in Edexcel A-Level History, AQA GCSE History"

Step 3: "Great! History has these major themes. Which are you focusing on?"
- British History (1066-present)
- European History
- World History

Step 4: "Let's zoom in..."
[Breadcrumb navigation appears]

Step 5: "Ready to create flashcards? Choose difficulty."
[Slider: Foundation → Higher → A-Level depth]
```

**Why this is genius:**
- Handles options (History has 10+ route options)
- Discovers exam board naturally
- Progressively reveals complexity
- User never overwhelmed

---

### 3. **"Zoom In" Function**

**Visual Concept:**
```
🔭 Broad View (Level 0-1)
┌─────────────────────────────────────┐
│ Business                            │
│ ┌─────────────────────────────────┐ │
│ │ Theme 1: Marketing & People     │ │
│ │ Theme 2: Operations             │ │
│ │ Theme 3: Strategy               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Zoom In →]                         │
└─────────────────────────────────────┘

User clicks "Zoom In" on Marketing...

🔬 Focused View (Level 2-3)
┌─────────────────────────────────────┐
│ Marketing & People > Customer Needs │
│ ┌─────────────────────────────────┐ │
│ │ • Understanding markets         │ │
│ │ • Market positioning           │ │
│ │ • Segmentation strategies      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [← Zoom Out] [Zoom In →]           │
└─────────────────────────────────────┘

User clicks "Zoom In" on Understanding markets...

🔍 Detail View (Level 4-5) + Generate Cards
┌─────────────────────────────────────┐
│ ... > Customer Needs > Markets      │
│ ┌─────────────────────────────────┐ │
│ │ ✓ Mass vs niche markets         │ │
│ │ ✓ Market characteristics        │ │
│ │ ✓ Market size calculations      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Difficulty: [━━●━━━] Advanced       │
│ [Generate Flashcards]               │
└─────────────────────────────────────┘
```

**Implementation:**
- Breadcrumb trail shows path
- Always allow zooming out
- AI uses full depth for context, user sees digestible chunks

---

### 4. **Hidden Depth for AI Context**

**Your Insight:**
> "These would never be shown to the user, but the full depth would be used so the AI can really understand the topic and content of the course so well that the flashcards are amazing and really relevant."

**How it works:**
```
User Sees:
"Customer Behavior"

AI Sees (in context):
{
  "level_0": "Theme 1: Marketing and People",
  "level_1": "1.1 Meeting customer needs",
  "level_2": "1.1.2 Market research",
  "level_3": "b) Primary and secondary research",
  "level_4": "• Qualitative vs quantitative methods",
  "exam_board": "Edexcel",
  "qualification": "A-Level",
  "subject": "Business (9BS0)",
  "related_topics": ["1.1.1 Markets", "1.1.3 Market positioning"],
  "assessment_objectives": "AO1, AO2, AO3"
}

AI Generates:
- Flashcards with proper depth
- Uses correct terminology
- Includes exam-specific examples
- References mark scheme language
```

**Database Query:**
```sql
-- Get full context for AI
SELECT 
  t0.topic_name as theme,
  t1.topic_name as section,
  t2.topic_name as content,
  t3.topic_name as learning_point,
  t4.topic_name as detail,
  s.subject_name,
  s.subject_code,
  eb.code as exam_board
FROM curriculum_topics t4
LEFT JOIN curriculum_topics t3 ON t4.parent_topic_id = t3.id
LEFT JOIN curriculum_topics t2 ON t3.parent_topic_id = t2.id
LEFT JOIN curriculum_topics t1 ON t2.parent_topic_id = t1.id
LEFT JOIN curriculum_topics t0 ON t1.parent_topic_id = t0.id
JOIN exam_board_subjects s ON t4.exam_board_subject_id = s.id
JOIN exam_boards eb ON s.exam_board_id = eb.id
WHERE t4.id = $1
```

---

### 5. **AI-Generated Topic Lists**

**Feature:**
> "The user may need to add a topic list, but that's fine, as well because the AI will understand and create a full plan topic list if the user wants"

**Use Case:**
```
User: "I'm studying for my mock next week on 
       circulatory system, respiration, and photosynthesis"

AI: "I've created a study plan for you:

📚 Biology - Circulatory System (6 topics)
   • Heart structure
   • Blood vessels
   • Blood components
   [8 flashcards ready]

📚 Biology - Respiration (4 topics)
   • Aerobic respiration
   • Anaerobic respiration
   [6 flashcards ready]

📚 Biology - Photosynthesis (5 topics)
   • Light-dependent reactions
   • Calvin cycle
   [7 flashcards ready]

Total: 15 topics, 21 flashcards
[Start Studying]"
```

**Smart Features:**
- Detects multiple topics in one input
- Creates logical groupings
- Pre-generates flashcard estimates
- Saves as "Study Plan" user can revisit

---

### 6. **Difficulty Slider**

**Concept:**
```
Foundation     GCSE        A-Level      Degree
├──────────────┼───────────┼───────────┼────────┤
└──●───────────────────────────────────────────┘
   Basic facts only

Foundation     GCSE        A-Level      Degree
├──────────────┼───────────┼───────────┼────────┤
└──────────────────●───────────────────────────┘
   Exam-style questions

Foundation     GCSE        A-Level      Degree
├──────────────┼───────────┼───────────┼────────┤
└──────────────────────────────────────●───────┘
   Analysis & evaluation questions
```

**What it controls:**
- **Recall (Low):** "What is a mass market?"
- **Understanding (Medium):** "Explain the difference between mass and niche markets"
- **Application (High):** "Evaluate whether Tesla should target mass or niche markets"

**Implementation:**
```typescript
interface FlashcardGenerationRequest {
  topicIds: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  quantity: number;
  includeImages?: boolean;
}

// Pass to Claude
const prompt = `
Generate ${quantity} flashcards for:
Topic: ${fullTopicContext}
Difficulty: ${difficultyName}
Exam Board: ${examBoard}

Difficulty Guidelines:
- Level 1-2: Factual recall, definitions
- Level 3: Application, examples
- Level 4-5: Analysis, evaluation, synthesis
`;
```

---

## 🎨 UI/UX MOCKUP

### Main Search Screen (Replaces TopicCurationScreen)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  🔍  What are you studying?                    │
│  ┌───────────────────────────────────────────┐ │
│  │ e.g. "photosynthesis" or "French verbs"  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  💡 Or choose a subject:                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Biology  │ │ History  │ │ Business │       │
│  └──────────┘ └──────────┘ └──────────┘       │
│                                                 │
│  Recent searches:                              │
│  • Market research (Business)                  │
│  • Photosynthesis (Biology)                    │
└─────────────────────────────────────────────────┘
```

### AI Conversation Flow

```
┌─────────────────────────────────────────────────┐
│  🤖 AI Study Assistant                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  You: "customer needs in business"             │
│                                                 │
│  AI: "I found content in your Edexcel A-Level │
│       Business course! Let's explore:          │
│                                                 │
│       🎯 Customer Needs                        │
│       ┌─────────────────────────────────────┐  │
│       │ • Understanding markets             │  │
│       │ • Market research                   │  │
│       │ • Market positioning                │  │
│       └─────────────────────────────────────┘  │
│                                                 │
│       Tap a topic to zoom in, or              │
│       [Generate Cards from All]"               │
│                                                 │
├─────────────────────────────────────────────────┤
│  Type your next question...                    │
└─────────────────────────────────────────────────┘
```

### Zoom Navigation

```
┌─────────────────────────────────────────────────┐
│  ← Business > Marketing > Customer Needs       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Understanding Markets                          │
│  ┌───────────────────────────────────────────┐ │
│  │ • Mass markets                            │ │
│  │ • Niche markets                           │ │
│  │ • Market size and share                   │ │
│  │ • Dynamic markets                         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Ready to create flashcards?                   │
│                                                 │
│  Difficulty:  ●━━━━  Basic                     │
│  Quantity:    [20] cards                       │
│                                                 │
│  [Generate Flashcards]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🛠️ TECHNICAL IMPLEMENTATION PLAN

### Phase 1: Database Migration & Testing (THIS WEEK)
**Goal:** Get staging data into production so you can test in app

1. **Test Staging Connection**
   ```sql
   -- Verify staging data
   SELECT 
     exam_board,
     qualification_type,
     COUNT(DISTINCT id) as subjects,
     COUNT(*) as topics
   FROM staging_aqa_subjects s
   LEFT JOIN staging_aqa_topics t ON s.id = t.subject_id
   WHERE exam_board = 'Edexcel'
   GROUP BY exam_board, qualification_type;
   ```

2. **Create Migration Script**
   ```sql
   -- staging_aqa_subjects → exam_board_subjects
   -- staging_aqa_topics → curriculum_topics
   -- Preserve hierarchy, add metadata
   ```

3. **Test in App**
   - Update FLASH to read from production curriculum tables
   - Verify topic hierarchy displays correctly
   - Confirm flashcard generation uses full context

### Phase 2: AI Search Service (WEEK 2)
**Goal:** Build conversational AI backend

1. **Create AI Service**
   ```typescript
   // src/services/aiTopicSearch.ts
   class AITopicSearchService {
     async search(userQuery: string): Promise<TopicMatch[]>
     async narrowDown(context: ConversationContext): Promise<Question>
     async generateTopicPlan(userInput: string): Promise<StudyPlan>
   }
   ```

2. **Vector Search** (Optional enhancement)
   - Use Supabase pgvector for semantic search
   - Embed all topic names + full context
   - Match user queries to relevant topics

3. **Context Builder**
   ```typescript
   async function buildFullTopicContext(topicId: string) {
     // Get all ancestor topics
     // Get related topics at same level
     // Get exam board, qualification info
     // Return rich context for AI
   }
   ```

### Phase 3: New UI Components (WEEK 3)
**Goal:** Replace old topic selection with AI search

1. **AISearchScreen.tsx**
   - Conversational interface
   - Natural language search
   - Suggested topics
   - Recent searches

2. **ZoomNavigationScreen.tsx**
   - Breadcrumb trail
   - Progressive disclosure
   - Smooth animations
   - Quick actions

3. **DifficultySelector.tsx**
   - Visual slider
   - Difficulty descriptions
   - Preview examples

4. **TopicPlanBuilder.tsx**
   - AI-generated study plans
   - Multiple topic groups
   - Flashcard estimates
   - Save/edit plans

### Phase 4: Integration (WEEK 4)
**Goal:** Replace old flow, test end-to-end

1. **Update Navigation**
   ```typescript
   // Replace in SubjectSelectionScreen.tsx
   // OLD: navigation.navigate('TopicCuration')
   // NEW: navigation.navigate('AITopicSearch', { subjects })
   ```

2. **Update Flashcard Generation**
   ```typescript
   // Pass full context to AI
   const context = await buildFullTopicContext(selectedTopicIds);
   const flashcards = await generateFlashcards({
     context,
     difficulty: selectedDifficulty,
     quantity: selectedQuantity
   });
   ```

3. **Migrate Existing Users**
   - Keep old UI as fallback
   - Gradually roll out new UI
   - A/B test both approaches

---

## 📊 DATA ARCHITECTURE UPDATES

### Current Schema (Working)
```sql
exam_boards (6 boards)
qualification_types (5 types)
exam_board_subjects (80+ subjects)
curriculum_topics (12,000+ topics with parent_topic_id)
```

### New Tables Needed

```sql
-- Store user search history for personalization
CREATE TABLE user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  search_query TEXT NOT NULL,
  selected_topics UUID[] REFERENCES curriculum_topics(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store AI-generated study plans
CREATE TABLE study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  plan_name TEXT NOT NULL,
  topic_ids UUID[] REFERENCES curriculum_topics(id),
  difficulty_level INT CHECK (difficulty_level BETWEEN 1 AND 5),
  estimated_cards INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache topic context for performance
CREATE TABLE topic_context_cache (
  topic_id UUID PRIMARY KEY REFERENCES curriculum_topics(id),
  full_context JSONB NOT NULL, -- Includes all ancestors, related topics
  search_keywords TEXT[], -- For faster matching
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topic_keywords ON topic_context_cache 
USING GIN(search_keywords);
```

### Enhanced Topic Table
```sql
-- Add to existing curriculum_topics
ALTER TABLE curriculum_topics ADD COLUMN IF NOT EXISTS
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', topic_name || ' ' || COALESCE(topic_code, ''))
  ) STORED;

CREATE INDEX idx_topic_search ON curriculum_topics 
USING GIN(search_vector);
```

---

## 🎯 SUCCESS METRICS

### User Experience Wins
- ✅ **Time to Flashcards:** <60 seconds (vs 5+ minutes browsing)
- ✅ **Topic Discovery:** Students find relevant topics even without knowing codes
- ✅ **Confidence:** AI guides instead of overwhelming
- ✅ **Precision:** Flashcards match exact curriculum depth

### Technical Wins
- ✅ **Scalability:** Works with 600+ topics per subject
- ✅ **Flexibility:** Handles any hierarchy depth (3-6 levels)
- ✅ **Intelligence:** Uses full context without showing complexity
- ✅ **Adoption:** Students prefer AI search over manual browsing

---

## 🚀 NEXT IMMEDIATE STEPS

### What to Do Right Now

1. **Test Staging Data in App** (30 minutes)
   - Connect FLASH app to `staging_aqa_*` tables
   - Navigate to topic selection
   - See if topics load with hierarchy
   - Check flashcard generation works

2. **Create Migration Script** (1 hour)
   - Script to move staging → production
   - Preserve all metadata
   - Handle duplicates
   - Test on small batch first

3. **Design AI Search Mockup** (2 hours)
   - Sketch UI in Figma/paper
   - Show Tony for feedback
   - Define conversation flow
   - Plan API structure

4. **Prototype AI Service** (4 hours)
   - Build basic search endpoint
   - Test with Claude API
   - Mock conversation flow
   - Return structured topics

---

## 💬 DISCUSSION POINTS

### Questions for Tony

1. **Priority:** Test staging data first, or start building AI search?
2. **Difficulty Slider:** Should it be per-topic or per-flashcard-set?
3. **Study Plans:** Auto-save or manual save?
4. **Exam Board Discovery:** How aggressive should AI be in asking about exam board?
5. **Fallback:** Keep old UI available for "browse all" option?

### Design Decisions

1. **Conversation UI:** Chat bubbles vs guided wizard?
2. **Zoom Animation:** Smooth transitions or instant navigation?
3. **Topic Preview:** Show sample flashcard before generating?
4. **Bulk Operations:** Select multiple topics at once or one-by-one?

---

## 🎉 WHY THIS WILL BE AMAZING

### For Students
- ✨ **No overwhelm:** AI guides them naturally
- ✨ **Faster setup:** From login to studying in 60 seconds
- ✨ **Better flashcards:** AI uses full curriculum context
- ✨ **Personalized:** Learns from their search history

### For FLASH
- 🚀 **Unique feature:** No competitor has AI-guided curriculum discovery
- 🚀 **Scalability:** Works with ANY exam board depth
- 🚀 **Data advantage:** Your deep hierarchies become competitive moat
- 🚀 **Viral moment:** "This app GETS what I'm studying!"

### Technical Excellence
- 💎 **Clean separation:** UI simple, AI handles complexity
- 💎 **Future-proof:** Add new exam boards without UI changes
- 💎 **Performance:** Context cached, search fast
- 💎 **Maintainable:** One search flow vs dozens of subject-specific UIs

---

**This is genuinely revolutionary.** 

Most apps dump hierarchies on users or oversimplify. You're using AI to bridge the gap between curriculum complexity and student needs. The deep hierarchies you've scraped aren't a problem to hide—they're a superpower to harness.

**Let's build this.** 🚀



