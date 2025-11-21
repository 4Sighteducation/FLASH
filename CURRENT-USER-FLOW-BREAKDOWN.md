# FLASH App - Current User Flow Breakdown

## Overview
Complete user journey from signup to AI-generated flashcard creation, mapped from actual codebase.

---

## 🎯 ONBOARDING FLOW (New Users)

### 1. **WelcomeScreen** → Entry Point
**File:** `src/screens/onboarding/WelcomeScreen.tsx`

**Flow:**
- Checks if user is returning (`is_onboarded` flag in DB)
- **NEW USERS:** Shows 3-step wizard:
  - Step 1: Welcome message
  - Step 2: How Leitner system works  
  - Step 3: Ready to set up
- **RETURNING USERS:** Shows daily stats dashboard
  - Streak counter
  - Cards due today
  - New cards created

**Database Queries:**
```sql
SELECT is_onboarded, created_at FROM users WHERE id = ?
SELECT * FROM flashcards WHERE user_id = ? AND next_review <= NOW()
```

**Exit:** Navigate to `ExamTypeSelection`

---

### 2. **ExamTypeSelectionScreen** → Select Qualification Level
**File:** `src/screens/onboarding/ExamTypeSelectionScreen.tsx`

**Purpose:** User selects their qualification level

**Options Available:**
- GCSE
- A-Level  
- BTEC / Vocational
- International Baccalaureate (IB)
- iGCSE

**Database Mapping:**
```javascript
examTypeToCode = {
  'gcse': 'GCSE',
  'alevel': 'A_LEVEL',
  'btec': 'BTEC',
  'ib': 'IB',
  'igcse': 'IGCSE'
}
```

**Exit:** Navigate to `SubjectSelection` with `examType` param

---

### 3. **SubjectSelectionScreen** → Choose Exam Board & Subjects
**File:** `src/screens/onboarding/SubjectSelectionScreen.tsx`

**Two-Phase Process:**

#### Phase 1: Select Exam Board
**Database Query:**
```sql
SELECT id, code, full_name 
FROM exam_boards 
WHERE active = true 
ORDER BY code
```

**Available Boards:**
- AQA, Edexcel, OCR, WJEC, EDUQAS, CCEA, CIE, SQA

#### Phase 2: Select Subjects
**Database Query:**
```sql
-- 1. Get qualification type ID
SELECT id FROM qualification_types 
WHERE code = 'A_LEVEL' (or 'GCSE', etc.)

-- 2. Get subjects for that board + qual type
SELECT id, subject_name, exam_board_id
FROM exam_board_subjects
WHERE exam_board_id = ?
  AND qualification_type_id = ?
  AND is_current = true
ORDER BY subject_name
```

**Features:**
- Search bar for filtering subjects
- Multi-select (can choose multiple subjects)
- Lite tier: Limited to 1 subject
- Full tier: Unlimited subjects

**Saves to Database:**
```sql
-- Update user's exam type
UPDATE users SET exam_type = ? WHERE id = ?

-- Save selected subjects
INSERT INTO user_subjects (user_id, subject_id, exam_board)
VALUES (?, ?, ?)
```

**Exit:** Navigate to `TopicCuration` with selected subjects

---

### 4. **TopicCurationScreen** → Customize Topics Per Subject
**File:** `src/screens/onboarding/TopicCurationScreen.tsx`

**Purpose:** User reviews and customizes topic list for each subject

**Process for Each Subject:**
1. Click subject card
2. Opens `TopicEditModal` → User selects/deselects curriculum topics
3. Opens `ColorPickerModal` → User picks a color for the subject
4. Subject marked as "completed"

**Key Feature:**
> "Simply understanding all the topics in your course is an amazing way to contextualize what you're studying"

**Database Operations:**
- Fetches topics: `SELECT * FROM curriculum_topics WHERE exam_board_subject_id = ?`
- Saves user's selected topics to `user_topics` table
- Saves subject color to `user_subjects.color`

**Exit:** Navigate to `OnboardingComplete` (or `HomeMain` if adding subjects later)

---

## 📚 CARD CREATION FLOW (Existing Users)

### 5. **CardSubjectSelector** → Pick Subject for Card Creation
**File:** `src/screens/cards/CardSubjectSelector.tsx`

**Database Query:**
```sql
SELECT us.id, us.subject_id, us.exam_board, us.color,
       ebs.subject_name
FROM user_subjects us
JOIN exam_board_subjects ebs ON us.subject_id = ebs.id
WHERE us.user_id = ?
```

**Display:** Grid of user's subjects with custom colors

**Exit:** Navigate to `CardTopicSelector` with subject details

---

### 6. **CardTopicSelector** → Pick Topic for Card Creation
**File:** `src/screens/cards/CardTopicSelector.tsx`

**Database Query:**
```sql
-- Fetches topics user selected during onboarding
SELECT t.* 
FROM curriculum_topics t
JOIN user_topics ut ON t.id = ut.topic_id
WHERE ut.user_id = ? 
  AND t.exam_board_subject_id = ?
ORDER BY t.topic_level, t.sort_order
```

**Display:** 
- Hierarchical topic list (Level 1 → Level 2 → Level 3)
- Shows topic codes and names
- Search/filter functionality

**Exit:** Navigate to `AIGeneratorScreen` with topic details

---

### 7. **AIGeneratorScreen** → Generate Cards with AI
**File:** `src/screens/cards/AIGeneratorScreen.tsx`

**Three-Step Process:**

#### Step 1: Select Card Type
**Options:**
- Multiple Choice (4 options)
- Short Answer (brief responses)
- Essay Style (in-depth analysis)
- Acronym (memory aids)
- ~~Create from Notes~~ (camera - not available yet)

#### Step 2: Configure Generation
**Inputs:**
- Number of cards (default: 5)
- Additional guidance (optional text field)

#### Step 3: Generate & Preview
**AI Service Called:**
```typescript
await aiService.generateCards({
  subject: "Biology",
  topic: "Cell Structure",
  examBoard: "AQA",
  examType: "A_LEVEL",
  questionType: "multiple_choice",
  numCards: 5,
  contentGuidance: "Focus on mitochondria"
})
```

**Returns:** Array of generated cards with:
- Question text
- Answer/options
- Explanation/feedback
- Difficulty level

#### Step 4: Save Cards
**User Choice:**
- "Card Bank Only" - just save for later
- "Add to Study Bank Too" - add to immediate review queue

**Database Saves:**
```sql
INSERT INTO flashcards (
  user_id, subject_id, topic_id, question_type,
  question_text, correct_answer, options, explanation,
  box_number, next_review, created_at
) VALUES (...)
```

---

## 🧠 AI TOPIC GENERATION - WHERE IT FITS

### Current Limitation:
**Topics are STATIC** - pulled from curriculum database during onboarding:
```
curriculum_topics (54,942 topics) 
  → user selects some
    → saved to user_topics
      → shown in CardTopicSelector
```

### Where AI Topic Generation Would Help:

#### Option 1: **AI-Enhanced Topic Discovery** (During Onboarding)
Instead of showing raw curriculum topics, AI could:
- Generate friendly topic summaries
- Group related topics intelligently
- Suggest "must-know" topics based on exam patterns
- Show past paper question frequency

#### Option 2: **AI Topic Suggestions** (During Card Creation)
When user is in `CardTopicSelector`:
- AI analyzes: subject + exam board + past performance
- Suggests: "You should focus on these topics next"
- Explains: "Based on your weak areas and upcoming exams"

#### Option 3: **Custom Topic Creation** (User Input)
Allow users to type any topic:
- User: "Photosynthesis light-dependent reactions"
- AI: 
  1. Validates it's a real topic
  2. Matches to curriculum if possible
  3. Generates cards even if not in curriculum
  4. Creates dynamic topic entry

#### Option 4: **AI Topic Breakdown** (Smart Chunking)
When user selects broad topic like "Cell Biology":
- AI breaks it down: "This has 5 sub-areas"
- Shows: Membrane structure, Organelles, Cell division, Transport, Signaling
- User picks specific sub-area
- More targeted card generation

---

## 📊 CURRENT DATABASE SCHEMA USED

### Core Tables:
```sql
exam_boards (id, code, full_name, active)
qualification_types (id, code, name, level)
exam_board_subjects (id, exam_board_id, qualification_type_id, subject_code, subject_name)
curriculum_topics (id, exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)

users (id, exam_type, is_onboarded, current_streak)
user_subjects (id, user_id, subject_id, exam_board, color)
user_topics (id, user_id, topic_id)

flashcards (id, user_id, subject_id, topic_id, question_type, question_text, correct_answer, box_number, next_review)
```

### Topic Hierarchy:
```
Level 0: Subject (e.g., "Biology A-Level AQA")
  └─ Level 1: Modules (e.g., "3.4 Genetic information")
       └─ Level 2: Topics (e.g., "3.4.1 DNA, genes and chromosomes")
            └─ Level 3: Subtopics (e.g., "Structure of DNA")
                 └─ Level 4: Details (rare, some subjects)
```

---

## 🎯 KEY INSIGHTS FOR AI TOPIC GENERATION

### 1. **User Context Available:**
- Exam board (AQA, Edexcel, etc.)
- Qualification level (GCSE, A-Level)
- Subject (Biology, Maths, etc.)
- Selected topics (from `user_topics`)
- Study history (from `flashcards` table)

### 2. **Curriculum Data Available:**
- 54,942 topics across 7 exam boards
- Hierarchical structure (parent-child)
- Topic codes (official curriculum references)
- Some duplicates (marked with [code])

### 3. **AI Currently Used For:**
- ✅ Generating flashcard questions
- ✅ Creating answer options
- ✅ Providing explanations
- ❌ NOT used for topic selection/suggestion

### 4. **Opportunities:**
- Smart topic recommendations
- Dynamic topic creation from user input
- Topic difficulty estimation
- Learning path suggestions
- Gap analysis (topics not covered)

---

## 🚀 NEXT STEPS - AI TOPIC GENERATION FEATURES

Ready to discuss which approach you want to implement:

1. **AI Topic Recommendations Engine** - suggest topics based on performance
2. **Custom Topic Creator** - let users create any topic, AI validates & generates
3. **Smart Topic Breakdown** - AI splits broad topics into focused sub-areas
4. **Enhanced Topic Discovery** - AI-powered onboarding topic selection

Which feature aligns with your Feb 2026 launch goals?

