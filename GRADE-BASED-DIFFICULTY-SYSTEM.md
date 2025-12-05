# Grade-Based Difficulty System

**Date:** November 21, 2025  
**Status:** Design Document  
**Concept:** Qualification-specific difficulty targeting for flashcard generation

---

## 🎯 THE REFINED VISION

Instead of a generic difficulty slider, **target grade-specific flashcard generation**:

### Foundation (BTEC-style)
```
Pass ────────● Merit ───────── Distinction
     (Basic)        (Applied)         (Analytical)
```

### GCSE
```
Grade 5 ── Grade 6 ── Grade 7 ── Grade 8 ──● Grade 9
(Foundation)  (Solid)   (Strong)   (High)   (Exceptional)
```

### A-Level
```
D ────── C ────── B ────●─── A ────── A*
(Pass)  (Average) (Good)  (Strong) (Outstanding)
```

**Why This Is Better:**
- ✅ **Relevant:** Students think in terms of target grades
- ✅ **Precise:** AI knows exact mark scheme expectations
- ✅ **Motivating:** Clear progression path
- ✅ **Exam-aligned:** Matches actual assessment criteria

---

## 🎨 UI DESIGN

### Dynamic Slider Based on Qualification

```typescript
interface DifficultySlider {
  qualification: 'Foundation' | 'GCSE' | 'A-Level' | 'International-GCSE' | 'International-A-Level';
  targetGrade: FoundationGrade | GCSEGrade | ALevelGrade;
}

type FoundationGrade = 'Pass' | 'Merit' | 'Distinction';
type GCSEGrade = 5 | 6 | 7 | 8 | 9;
type ALevelGrade = 'D' | 'C' | 'B' | 'A' | 'A*';
```

### Visual Component

```tsx
// GCSE Slider Example
┌─────────────────────────────────────────────────┐
│  Target Grade for Flashcards                   │
│                                                 │
│  Grade 5    6    7    8    9                   │
│  ├────●────┼────┼────┼────┤                    │
│  Foundation    Strong  Exceptional             │
│                                                 │
│  Currently targeting: Grade 6                   │
│  "Solid understanding with good application"    │
│                                                 │
│  Example question at this level:                │
│  "Explain how market research helps            │
│   businesses reduce risk" (4 marks)            │
└─────────────────────────────────────────────────┘
```

### A-Level Slider Example

```tsx
┌─────────────────────────────────────────────────┐
│  Target Grade for Flashcards                   │
│                                                 │
│   D    C    B    A    A*                       │
│   ├────┼────┼────●────┼────┤                   │
│   Pass     Good   Outstanding                  │
│                                                 │
│  Currently targeting: A Grade                   │
│  "Strong analysis with detailed evaluation"    │
│                                                 │
│  Example question at this level:                │
│  "Evaluate the extent to which market          │
│   research can guarantee business success"     │
│   (20 marks)                                   │
└─────────────────────────────────────────────────┘
```

---

## 📊 GRADE DEFINITIONS & AI PROMPTING

### Foundation (Pass/Merit/Distinction)

```typescript
const foundationGradeDescriptors = {
  Pass: {
    level: 1,
    description: "Basic recall and understanding",
    questionTypes: ["Define", "List", "Identify", "State"],
    markRange: "0-4 marks typical",
    aiPrompt: `Generate flashcards at Foundation Pass level:
- Simple recall questions
- Clear definitions
- Basic examples
- Short answers (1-2 sentences)
- Focus on "what" not "why"`
  },
  
  Merit: {
    level: 2,
    description: "Application of knowledge in familiar contexts",
    questionTypes: ["Explain", "Describe", "Give reasons", "How"],
    markRange: "5-8 marks typical",
    aiPrompt: `Generate flashcards at Foundation Merit level:
- Application questions with context
- Explanation required (2-3 sentences)
- Link concepts together
- Use scenarios/examples
- Focus on "how" and "why"`
  },
  
  Distinction: {
    level: 3,
    description: "Analysis and evaluation in complex contexts",
    questionTypes: ["Analyse", "Evaluate", "Assess", "Justify"],
    markRange: "9-12 marks typical",
    aiPrompt: `Generate flashcards at Foundation Distinction level:
- Analytical questions
- Require evaluation and judgement
- Complex scenarios
- Extended responses (4-5 sentences)
- Focus on "to what extent" and "evaluate"`
  }
};
```

### GCSE (Grades 5-9)

```typescript
const gcseGradeDescriptors = {
  5: {
    tier: "Foundation Top / Higher Bottom",
    description: "Solid understanding with some application",
    questionTypes: ["Describe", "Explain", "Calculate"],
    markRange: "1-6 marks typical",
    aiPrompt: `Generate flashcards at GCSE Grade 5 level:
- Clear explanations required
- Basic application to scenarios
- Some analysis expected
- 2-4 mark questions focus
- Use command words: describe, explain, give reasons`
  },
  
  6: {
    tier: "Higher - Secure",
    description: "Good understanding with consistent application",
    questionTypes: ["Explain", "Analyse", "Compare", "Calculate with steps"],
    markRange: "4-9 marks typical",
    aiPrompt: `Generate flashcards at GCSE Grade 6 level:
- Detailed explanations
- Application to new contexts
- Some analysis and evaluation
- 4-6 mark questions focus
- Multi-step calculations
- Use command words: explain, analyse, compare`
  },
  
  7: {
    tier: "Higher - Strong",
    description: "Strong understanding with detailed analysis",
    questionTypes: ["Analyse", "Evaluate", "Discuss", "Complex calculations"],
    markRange: "6-12 marks typical",
    aiPrompt: `Generate flashcards at GCSE Grade 7 level:
- Detailed analysis required
- Evaluation with justified reasoning
- Complex problem-solving
- 6-9 mark questions focus
- Multi-concept integration
- Use command words: analyse, evaluate, discuss, assess`
  },
  
  8: {
    tier: "Higher - High Attainer",
    description: "Thorough understanding with sophisticated evaluation",
    questionTypes: ["Evaluate", "Assess", "To what extent", "Complex multi-step"],
    markRange: "9-15 marks typical",
    aiPrompt: `Generate flashcards at GCSE Grade 8 level:
- Sophisticated analysis
- Balanced evaluation with counterarguments
- Complex synoptic questions
- 9-12 mark questions focus
- Multiple concepts linked
- Use command words: evaluate, assess, to what extent, justify`
  },
  
  9: {
    tier: "Higher - Exceptional",
    description: "Exceptional depth with nuanced evaluation",
    questionTypes: ["Evaluate critically", "Assess significance", "Synoptic"],
    markRange: "12-20 marks typical",
    aiPrompt: `Generate flashcards at GCSE Grade 9 level:
- Critical evaluation with nuance
- Synoptic connections across topics
- Sophisticated written responses
- 12-20 mark extended questions
- Multiple perspectives considered
- Use command words: evaluate critically, assess significance, discuss in detail`
  }
};
```

### A-Level (D to A*)

```typescript
const alevelGradeDescriptors = {
  D: {
    description: "Basic pass - recall and simple application",
    ao1: "Some knowledge demonstrated",
    ao2: "Limited application",
    ao3: "Little analysis/evaluation",
    markRange: "40-49%",
    aiPrompt: `Generate flashcards at A-Level D grade:
- Basic recall of key terms
- Simple explanations (2-3 sentences)
- Basic examples
- Focus on AO1 (knowledge)
- 4-6 mark questions
- Command words: state, identify, outline`
  },
  
  C: {
    description: "Adequate understanding with some application",
    ao1: "Adequate knowledge",
    ao2: "Some application to context",
    ao3: "Basic analysis",
    markRange: "50-59%",
    aiPrompt: `Generate flashcards at A-Level C grade:
- Clear explanations
- Application to given contexts
- Some analytical points
- Mix of AO1 and AO2
- 6-10 mark questions
- Command words: explain, apply, analyse`
  },
  
  B: {
    description: "Good understanding with consistent application",
    ao1: "Good knowledge",
    ao2: "Consistent application",
    ao3: "Sound analysis with some evaluation",
    markRange: "60-69%",
    aiPrompt: `Generate flashcards at A-Level B grade:
- Detailed explanations with examples
- Strong application to context
- Analytical chains of reasoning
- Balanced AO1, AO2, AO3
- 10-16 mark questions
- Command words: analyse, evaluate, discuss`
  },
  
  A: {
    description: "Strong understanding with detailed evaluation",
    ao1: "Thorough knowledge",
    ao2: "Effective application",
    ao3: "Detailed analysis and evaluation",
    markRange: "70-79%",
    aiPrompt: `Generate flashcards at A-Level A grade:
- Comprehensive explanations
- Sophisticated application
- Detailed chains of reasoning
- Balanced evaluation
- Focus on AO3
- 16-25 mark questions
- Command words: evaluate, assess, to what extent`
  },
  
  "A*": {
    description: "Outstanding with sophisticated evaluation",
    ao1: "Comprehensive knowledge",
    ao2: "Sophisticated application",
    ao3: "Nuanced evaluation with synoptic links",
    markRange: "80%+",
    aiPrompt: `Generate flashcards at A-Level A* grade:
- Comprehensive synoptic responses
- Sophisticated evaluation with counterarguments
- Nuanced judgements
- Multiple theoretical perspectives
- Strong focus on AO3
- 20-25 mark extended questions
- Command words: evaluate critically, assess significance, discuss in depth`
  }
};
```

---

## 🎯 USER EXPERIENCE FLOW

### 1. Onboarding - Set Initial Target Grade

```
After selecting subject...

AI: "What grade are you aiming for in Biology?"

[GCSE Grades Shown]
┌─────────────────────────────────────┐
│  Select Your Target Grade           │
│                                     │
│  Grade 5  ⭕ Solid foundation       │
│  Grade 6  ⭕ Good understanding     │
│  Grade 7  ⭕ Strong performance     │
│  Grade 8  ⭕ High achievement       │
│  Grade 9  ⭕ Exceptional mastery    │
│                                     │
│  [Save Target Grade]                │
└─────────────────────────────────────┘
```

### 2. Creating Flashcards - Adjust Difficulty

```
During AI topic search...

User selects: "Photosynthesis"

┌─────────────────────────────────────┐
│  Create Flashcards                  │
│                                     │
│  Topic: Photosynthesis              │
│  Subject: Biology GCSE              │
│                                     │
│  Target Grade: [Grade 7 ▼]         │
│  ├────┼────●────┼────┤              │
│  5    6    7    8    9              │
│                                     │
│  Number of cards: [20]              │
│                                     │
│  ℹ️  Cards will include:            │
│  • Detailed explanations            │
│  • Analysis questions               │
│  • 6-9 mark style questions         │
│                                     │
│  [Generate Cards]                   │
└─────────────────────────────────────┘
```

### 3. Study Mode - Practice at Grade Level

```
During study session...

┌─────────────────────────────────────┐
│  Card 5 of 20                       │
│                                     │
│  Targeting: Grade 7                 │
│                                     │
│  Q: Explain how the structure of    │
│     chloroplasts is adapted for     │
│     photosynthesis. (6 marks)       │
│                                     │
│  [Flip Card]                        │
│                                     │
│  Too Hard? [Switch to Grade 6]      │
│  Too Easy? [Switch to Grade 8]      │
└─────────────────────────────────────┘
```

---

## 🤖 AI INTEGRATION

### Flashcard Generation API Call

```typescript
interface GenerateFlashcardsRequest {
  topicId: string;
  qualification: QualificationType;
  targetGrade: string; // '7' or 'A' or 'Merit'
  quantity: number;
  examBoard: string;
}

async function generateFlashcards(request: GenerateFlashcardsRequest) {
  // Get full topic context
  const topicContext = await buildFullTopicContext(request.topicId);
  
  // Get grade descriptor
  const gradeInfo = getGradeDescriptor(
    request.qualification, 
    request.targetGrade
  );
  
  // Build AI prompt
  const prompt = `
You are an expert ${request.examBoard} ${request.qualification} examiner.

Context:
- Subject: ${topicContext.subject}
- Topic: ${topicContext.fullPath} // e.g., "Biology > Cells > Photosynthesis"
- Exam Board: ${request.examBoard}
- Qualification: ${request.qualification}

Target Grade: ${request.targetGrade}
${gradeInfo.aiPrompt}

Question Style for ${request.targetGrade}:
- Typical mark range: ${gradeInfo.markRange}
- Command words: ${gradeInfo.questionTypes.join(', ')}
- Assessment objectives: ${gradeInfo.ao1}, ${gradeInfo.ao2}, ${gradeInfo.ao3}

Generate ${request.quantity} flashcards that:
1. Target ${request.targetGrade} grade level
2. Use appropriate command words
3. Match mark scheme expectations
4. Include mark allocations in questions
5. Provide detailed mark scheme answers

Topic hierarchy for context:
${JSON.stringify(topicContext.hierarchy)}

Related topics (for synoptic links):
${topicContext.relatedTopics.join(', ')}
`;

  const response = await callClaudeAPI(prompt);
  return parseFlashcards(response);
}
```

---

## 📊 DATABASE SCHEMA UPDATES

```sql
-- Add target grade to user subjects
ALTER TABLE user_subjects 
ADD COLUMN target_grade VARCHAR(5); -- '5', '6', '7', 'A', 'Merit', etc.

-- Store qualification type with user
ALTER TABLE users
ADD COLUMN default_target_grade_gcse INT CHECK (default_target_grade_gcse BETWEEN 5 AND 9),
ADD COLUMN default_target_grade_alevel VARCHAR(2) CHECK (default_target_grade_alevel IN ('D', 'C', 'B', 'A', 'A*')),
ADD COLUMN default_target_grade_foundation VARCHAR(15) CHECK (default_target_grade_foundation IN ('Pass', 'Merit', 'Distinction'));

-- Track flashcard difficulty
ALTER TABLE flashcards
ADD COLUMN target_grade VARCHAR(5),
ADD COLUMN qualification_type VARCHAR(50),
ADD COLUMN estimated_marks INT; -- e.g., 6 marks, 12 marks

-- Analytics: Track which grades students find challenging
CREATE TABLE grade_performance_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  subject_id UUID REFERENCES exam_board_subjects(id),
  target_grade VARCHAR(5),
  cards_studied INT,
  average_confidence DECIMAL(3,2),
  success_rate DECIMAL(3,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎓 GRADE PROGRESSION TRACKING

### Feature: "Grade Progress Dashboard"

```
┌─────────────────────────────────────────────────┐
│  Biology GCSE - Grade Progress                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Current Target: Grade 7                       │
│  ├────┼────●────┼────┤                          │
│  5    6    7    8    9                          │
│                                                 │
│  Your Performance:                              │
│  Grade 5-6 Content: ✅ 95% mastered            │
│  Grade 7 Content:   📊 67% confident           │
│  Grade 8 Content:   ⏳ Ready to try?           │
│                                                 │
│  Recommendation:                                │
│  💡 You're doing well at Grade 7!              │
│     Try some Grade 8 questions to push          │
│     yourself further.                           │
│                                                 │
│  [Practice Grade 8 Questions]                   │
└─────────────────────────────────────────────────┘
```

### Adaptive Difficulty

```typescript
// Auto-adjust based on performance
if (userConfidence >= 0.85 && successRate >= 0.80) {
  suggestGradeIncrease();
} else if (userConfidence <= 0.50 && successRate <= 0.60) {
  suggestGradeDecrease();
}
```

---

## 🌍 INTERNATIONAL QUALIFICATIONS

### International GCSE (Same as GCSE)
- Grades: 9-4 (same scale)
- Use same slider and descriptors

### International A-Level (Same as A-Level)
- Grades: A*-E (same scale)
- Use same slider and descriptors

### Other International
```typescript
const internationalQualifications = {
  'IB': {
    scale: [1, 2, 3, 4, 5, 6, 7],
    descriptor: 'IB Score'
  },
  'AP': {
    scale: [1, 2, 3, 4, 5],
    descriptor: 'AP Score'
  }
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create grade descriptor files for each qualification
- [ ] Build dynamic slider component
- [ ] Update flashcard generation service
- [ ] Add target grade to user profile
- [ ] Create grade progression dashboard
- [ ] Test AI prompts for each grade level
- [ ] Add "adjust difficulty" during study
- [ ] Build analytics for grade performance

---

**This is pedagogically sound and technically elegant.** Students will love seeing "Grade 7" instead of "Medium difficulty" because it's **meaningful** to them. 🎯



