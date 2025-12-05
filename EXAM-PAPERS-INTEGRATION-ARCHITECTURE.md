# Exam Papers Integration - Complete Architecture

**Date:** November 21, 2025  
**Status:** Design Document - Feature Not Yet Built  
**Complexity:** High - Multiple AI systems + PDF processing + UI components

---

## 🎯 THE VISION

Transform exam papers from static PDFs into **intelligent, interactive learning experiences**.

### What Users Get
1. **AI-Generated Practice Questions** - Based on real exam papers
2. **Smart Answer Feedback** - Using mark schemes + examiner reports
3. **Download Original Papers** - For offline practice
4. **Question Bank** - Searchable by topic, difficulty, marks
5. **Exam Technique Coaching** - Learn from examiner insights

### Why This Is Powerful
- 📄 **You have 850+ paper sets** (questions + mark schemes + examiner reports)
- 🤖 **AI can understand patterns** across years of papers
- 🎓 **Examiner reports reveal common mistakes** - AI coaches students
- ⚡ **Interactive > Static PDFs** - Students engage more

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Components

```
┌────────────────────────────────────────────────────────┐
│                  EXAM PAPER SYSTEM                     │
└────────────────────────────────────────────────────────┘

1. PAPER EXTRACTION PIPELINE
   ├─ PDF Processing
   ├─ Question Extraction
   ├─ Mark Scheme Parsing
   └─ Examiner Report Synthesis

2. QUESTION BANK DATABASE
   ├─ Store extracted questions
   ├─ Link to topics
   ├─ Tag with metadata
   └─ Enable search

3. AI GENERATION ENGINE
   ├─ Generate similar questions
   ├─ Adapt difficulty
   └─ Create variations

4. ANSWER EVALUATION SYSTEM
   ├─ Check student answers
   ├─ Apply mark scheme
   └─ Provide feedback

5. USER INTERFACE
   ├─ Practice mode
   ├─ Timed exam mode
   ├─ Download papers
   └─ Progress tracking
```

---

## 📊 DATABASE SCHEMA

### Core Tables

```sql
-- Store exam paper metadata
CREATE TABLE exam_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES exam_board_subjects(id),
  paper_number INT, -- Paper 1, Paper 2, etc.
  year INT,
  series VARCHAR(20), -- 'June', 'November', 'October'
  qualification_type VARCHAR(50), -- 'GCSE', 'A-Level'
  exam_board VARCHAR(20), -- 'Edexcel', 'AQA', etc.
  
  -- PDF URLs
  question_paper_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  
  -- Metadata
  total_marks INT,
  duration_minutes INT,
  tier VARCHAR(20), -- 'Foundation', 'Higher', null for A-Level
  
  -- Processing status
  extracted BOOLEAN DEFAULT false,
  questions_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store individual questions extracted from papers
CREATE TABLE exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES exam_papers(id),
  
  -- Question details
  question_number VARCHAR(10), -- '1', '2a', '3(ii)', etc.
  question_text TEXT NOT NULL,
  marks INT NOT NULL,
  
  -- Question type classification
  question_type VARCHAR(50), -- 'multiple_choice', 'short_answer', 'extended_response'
  command_word VARCHAR(50), -- 'Explain', 'Evaluate', 'Calculate', etc.
  
  -- Links to curriculum
  topic_ids UUID[], -- Array of curriculum_topics.id
  keywords TEXT[], -- For search
  
  -- Difficulty (derived from grade boundaries + question analysis)
  difficulty_level INT CHECK (difficulty_level BETWEEN 1 AND 5),
  grade_focus VARCHAR(10), -- '5-6', '7-8', '9', 'A', 'A*', etc.
  
  -- Associated content
  has_diagram BOOLEAN DEFAULT false,
  diagram_url TEXT,
  context_text TEXT, -- Scenario/stem for the question
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store mark schemes (structured)
CREATE TABLE mark_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES exam_questions(id),
  
  -- Mark scheme content
  marking_points JSONB, -- Array of acceptable answers
  /*
  Example:
  {
    "points": [
      {"marks": 1, "answer": "Mass markets have larger sales volume", "keywords": ["mass", "larger", "volume"]},
      {"marks": 1, "answer": "Niche markets target specific segments", "keywords": ["niche", "specific", "segment"]}
    ],
    "levels": [
      {"level": 1, "marks": "1-2", "descriptor": "Basic understanding"},
      {"level": 2, "marks": "3-4", "descriptor": "Clear explanation"},
      {"level": 3, "marks": "5-6", "descriptor": "Detailed analysis"}
    ]
  }
  */
  
  -- For level-based marking (extended response)
  levels JSONB,
  
  -- Examiner guidance
  examiner_notes TEXT,
  common_misconceptions TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store examiner report insights
CREATE TABLE examiner_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES exam_questions(id),
  paper_id UUID REFERENCES exam_papers(id),
  
  -- Insights from examiner reports
  average_mark DECIMAL(4,2),
  common_errors TEXT[],
  good_practice TEXT[],
  advice_for_students TEXT,
  
  -- Quotes from examiner report
  examiner_comments TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store AI-generated questions (similar to real ones)
CREATE TABLE ai_generated_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  based_on_question_id UUID REFERENCES exam_questions(id),
  
  -- Generated question
  question_text TEXT NOT NULL,
  marks INT NOT NULL,
  
  -- Generation metadata
  variation_type VARCHAR(50), -- 'different_context', 'higher_difficulty', 'lower_difficulty'
  ai_model VARCHAR(50), -- 'claude-3-opus', etc.
  
  -- Same structure as exam_questions
  topic_ids UUID[],
  difficulty_level INT,
  grade_focus VARCHAR(10),
  
  -- Mark scheme for generated question
  suggested_answers JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track student attempts
CREATE TABLE question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  question_id UUID, -- Can link to exam_questions OR ai_generated_questions
  question_type VARCHAR(20), -- 'real_exam' or 'ai_generated'
  
  -- Attempt details
  user_answer TEXT,
  marks_awarded INT,
  max_marks INT,
  
  -- AI feedback
  feedback TEXT,
  strengths TEXT[],
  improvements TEXT[],
  
  -- Metadata
  time_taken_seconds INT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question collections (custom practice sets)
CREATE TABLE question_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  
  name VARCHAR(255),
  description TEXT,
  
  -- Questions in this collection
  question_ids JSONB, -- [{type: 'real_exam', id: '...'}, {type: 'ai_generated', id: '...'}]
  
  -- Settings
  is_public BOOLEAN DEFAULT false,
  is_timed BOOLEAN DEFAULT false,
  time_limit_minutes INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance

```sql
CREATE INDEX idx_exam_papers_subject ON exam_papers(subject_id);
CREATE INDEX idx_exam_papers_year ON exam_papers(year);
CREATE INDEX idx_exam_questions_paper ON exam_questions(paper_id);
CREATE INDEX idx_exam_questions_topics ON exam_questions USING GIN(topic_ids);
CREATE INDEX idx_exam_questions_difficulty ON exam_questions(difficulty_level);
CREATE INDEX idx_question_attempts_user ON question_attempts(user_id);
CREATE INDEX idx_mark_schemes_question ON mark_schemes(question_id);
```

---

## 🤖 AI EXTRACTION PIPELINE

### Phase 1: PDF Processing

```python
# services/paper_extraction/pdf_processor.py
import fitz  # PyMuPDF
from anthropic import Anthropic

class ExamPaperProcessor:
    """
    Extract questions, mark schemes, and examiner insights from PDFs
    """
    
    async def process_paper(self, paper_id: str):
        """
        Main processing pipeline
        """
        paper = await get_exam_paper(paper_id)
        
        # Step 1: Extract text from PDFs
        qp_text = self.extract_pdf_text(paper.question_paper_url)
        ms_text = self.extract_pdf_text(paper.mark_scheme_url)
        er_text = self.extract_pdf_text(paper.examiner_report_url) if paper.examiner_report_url else None
        
        # Step 2: Use AI to structure the content
        questions = await self.extract_questions(qp_text, paper)
        mark_schemes = await self.extract_mark_schemes(ms_text, questions)
        insights = await self.extract_examiner_insights(er_text, questions) if er_text else []
        
        # Step 3: Link to curriculum topics
        await self.link_questions_to_topics(questions, paper.subject_id)
        
        # Step 4: Save to database
        await self.save_extracted_data(paper_id, questions, mark_schemes, insights)
        
        return len(questions)
    
    def extract_pdf_text(self, pdf_url: str) -> str:
        """
        Download PDF and extract text with layout preservation
        """
        response = requests.get(pdf_url)
        pdf_document = fitz.open(stream=response.content, filetype="pdf")
        
        text = ""
        for page_num in range(pdf_document.page_count):
            page = pdf_document[page_num]
            text += page.get_text("text")
            # Also extract images for diagrams
            images = page.get_images()
            if images:
                text += f"\n[DIAGRAM ON PAGE {page_num + 1}]\n"
        
        return text
    
    async def extract_questions(self, qp_text: str, paper: ExamPaper) -> List[Question]:
        """
        Use Claude to structure questions from text
        """
        client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        
        prompt = f"""
You are an expert exam question extractor.

Extract all questions from this {paper.exam_board} {paper.qualification_type} exam paper.

Paper details:
- Subject: {paper.subject_name}
- Paper {paper.paper_number}
- Year: {paper.year}
- Series: {paper.series}

Question paper text:
{qp_text}

For each question, extract:
1. Question number (e.g., "1", "2a", "3(ii)")
2. Full question text
3. Marks allocated
4. Command word used (e.g., "Explain", "Evaluate", "Calculate")
5. Question type (multiple_choice, short_answer, extended_response)
6. Context/stem if provided
7. Whether it has a diagram

Return as JSON array:
[
  {{
    "question_number": "1",
    "question_text": "Define the term 'mass market'. (2 marks)",
    "marks": 2,
    "command_word": "Define",
    "question_type": "short_answer",
    "context_text": null,
    "has_diagram": false
  }},
  ...
]

Be thorough - extract ALL questions including sub-parts.
"""
        
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        questions_json = json.loads(response.content[0].text)
        return [Question(**q) for q in questions_json]
    
    async def extract_mark_schemes(self, ms_text: str, questions: List[Question]) -> List[MarkScheme]:
        """
        Extract and structure mark schemes
        """
        prompt = f"""
You are an expert at analyzing exam mark schemes.

For each question, extract the marking points.

Questions:
{json.dumps([q.dict() for q in questions], indent=2)}

Mark scheme text:
{ms_text}

For each question, extract:
1. Individual marking points (each worth X marks)
2. Keywords that trigger marks
3. For extended response: marking levels and descriptors
4. Examiner guidance/notes

Return as JSON array matching question order:
[
  {{
    "question_number": "1",
    "marking_points": [
      {{"marks": 1, "answer": "A market with a large number of customers", "keywords": ["large", "many", "customers"]}},
      {{"marks": 1, "answer": "Appeals to the whole market", "keywords": ["whole", "all", "entire", "market"]}}
    ],
    "levels": null,
    "examiner_notes": "Accept 'mass appeal' or 'large target market'"
  }},
  ...
]
"""
        # Similar Claude API call
        # Return structured mark schemes
        pass
    
    async def extract_examiner_insights(self, er_text: str, questions: List[Question]) -> List[ExaminerInsight]:
        """
        Extract insights from examiner reports
        """
        prompt = f"""
You are analyzing an examiner report to help students improve.

Extract insights for each question:
1. Average mark achieved
2. Common errors students made
3. Examples of good practice
4. Advice for future students

Examiner report text:
{er_text}

Return insights per question with helpful, actionable advice.
"""
        # Parse examiner report
        # Return insights
        pass
    
    async def link_questions_to_topics(self, questions: List[Question], subject_id: str):
        """
        Use AI to link questions to curriculum topics
        """
        # Get all topics for this subject
        topics = await get_subject_topics(subject_id)
        
        for question in questions:
            prompt = f"""
Question: {question.question_text}

Available curriculum topics:
{json.dumps([{"id": t.id, "name": t.topic_name, "code": t.topic_code} for t in topics])}

Which topics does this question test? Return topic IDs as array.
"""
            # Use Claude to match
            # Update question.topic_ids
            pass
```

---

## 🎯 AI GENERATION ENGINE

### Generate Similar Questions

```python
# services/question_generation/ai_generator.py
class QuestionGenerator:
    """
    Generate new questions based on real exam questions
    """
    
    async def generate_similar_question(
        self, 
        source_question_id: str,
        variation_type: str = 'different_context',
        target_grade: str = None
    ):
        """
        Generate a new question similar to a real exam question
        """
        # Get source question + mark scheme + context
        question = await get_exam_question(source_question_id)
        mark_scheme = await get_mark_scheme(source_question_id)
        topic_context = await get_full_topic_context(question.topic_ids)
        
        prompt = f"""
You are an expert {question.exam_board} examiner creating practice questions.

Source Question (from real {question.year} paper):
{question.question_text} ({question.marks} marks)

Mark Scheme:
{json.dumps(mark_scheme.marking_points)}

Topic Context:
{topic_context}

Task: Generate a NEW question that:
1. Tests the same skills and knowledge
2. Uses a DIFFERENT context/scenario
3. Has the same mark allocation ({question.marks} marks)
4. Matches the same command word: {question.command_word}
{f"5. Targets {target_grade} grade level" if target_grade else ""}

Variation type: {variation_type}

Return:
{{
  "question_text": "...",
  "marks": {question.marks},
  "suggested_mark_scheme": [
    {{"marks": 1, "answer": "..."}},
    ...
  ],
  "reasoning": "Why this is a good equivalent question"
}}
"""
        
        response = await call_claude(prompt)
        generated = json.loads(response)
        
        # Save to ai_generated_questions table
        return await save_generated_question(generated, source_question_id, variation_type)
    
    async def generate_topic_questions(
        self,
        topic_id: str,
        quantity: int,
        target_grade: str,
        question_types: List[str] = None
    ):
        """
        Generate practice questions for a specific topic
        """
        # Get all real exam questions for this topic
        real_questions = await get_questions_by_topic(topic_id)
        
        # Get topic context
        topic_context = await get_full_topic_context([topic_id])
        
        prompt = f"""
Generate {quantity} exam-style questions for:

Topic: {topic_context.full_path}
Target Grade: {target_grade}
Question Types: {question_types or 'varied'}

Based on analysis of real exam questions:
{json.dumps([q.dict() for q in real_questions[:5]], indent=2)}

Requirements:
- Match {topic_context.exam_board} style and standards
- Use appropriate command words for {target_grade} level
- Include mark allocations
- Provide mark schemes

Return array of questions with mark schemes.
"""
        
        # Generate questions
        # Save to database
        pass
```

---

## ✅ ANSWER EVALUATION SYSTEM

### Check Student Answers

```python
# services/answer_evaluation/evaluator.py
class AnswerEvaluator:
    """
    Evaluate student answers using mark schemes and AI
    """
    
    async def evaluate_answer(
        self,
        question_id: str,
        question_type: str,  # 'real_exam' or 'ai_generated'
        user_answer: str,
        user_id: str
    ):
        """
        Mark a student's answer
        """
        # Get question and mark scheme
        if question_type == 'real_exam':
            question = await get_exam_question(question_id)
            mark_scheme = await get_mark_scheme(question_id)
            insights = await get_examiner_insights(question_id)
        else:
            question = await get_ai_generated_question(question_id)
            mark_scheme = question.suggested_answers
            insights = None
        
        # Use AI to mark the answer
        prompt = f"""
You are an expert examiner marking a student's answer.

Question: {question.question_text} ({question.marks} marks)

Mark Scheme:
{json.dumps(mark_scheme.marking_points)}

{f"Examiner Insights: {insights.advice_for_students}" if insights else ""}

Student's Answer:
{user_answer}

Task:
1. Award marks according to the mark scheme
2. Identify which marking points were achieved
3. Provide constructive feedback
4. Highlight common errors if present
5. Suggest improvements

Return:
{{
  "marks_awarded": 0-{question.marks},
  "max_marks": {question.marks},
  "points_achieved": ["Point 1 text", "Point 2 text"],
  "points_missed": ["Missing point 1", ...],
  "feedback": "Overall feedback...",
  "strengths": ["What student did well"],
  "improvements": ["Specific ways to improve"],
  "examiner_tip": "Common mistake to avoid..."
}}
"""
        
        response = await call_claude(prompt)
        evaluation = json.loads(response)
        
        # Save attempt
        await save_question_attempt(
            user_id=user_id,
            question_id=question_id,
            question_type=question_type,
            user_answer=user_answer,
            marks_awarded=evaluation['marks_awarded'],
            max_marks=question.marks,
            feedback=evaluation['feedback'],
            strengths=evaluation['strengths'],
            improvements=evaluation['improvements']
        )
        
        return evaluation
```

---

## 🎨 USER INTERFACE COMPONENTS

### 1. Practice Mode Screen

```tsx
// src/screens/practice/PracticeModeScreen.tsx
export default function PracticeModeScreen() {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [targetGrade, setTargetGrade] = useState('7');
  const [questionType, setQuestionType] = useState('mixed');
  
  return (
    <View>
      <Text>Practice Exam Questions</Text>
      
      {/* Topic Selection */}
      <TopicPicker
        onSelect={setSelectedTopics}
        multiSelect
      />
      
      {/* Grade Target */}
      <GradeSlider
        value={targetGrade}
        onChange={setTargetGrade}
      />
      
      {/* Question Type */}
      <SegmentedControl
        options={['Real Exam', 'AI Generated', 'Mixed']}
        value={questionType}
        onChange={setQuestionType}
      />
      
      {/* Start Practice */}
      <Button onPress={startPractice}>
        Generate Practice Questions
      </Button>
    </View>
  );
}
```

### 2. Question Display Screen

```tsx
// src/screens/practice/QuestionScreen.tsx
export default function QuestionScreen({ question }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async () => {
    setLoading(true);
    const result = await evaluateAnswer(question.id, userAnswer);
    setEvaluation(result);
    setLoading(false);
  };
  
  return (
    <ScrollView>
      {/* Question */}
      <Card>
        <Text style={styles.questionNumber}>
          Question {question.question_number}
        </Text>
        <Text style={styles.questionText}>
          {question.question_text}
        </Text>
        <Badge>{question.marks} marks</Badge>
        {question.has_diagram && (
          <Image source={{ uri: question.diagram_url }} />
        )}
      </Card>
      
      {/* Answer Input */}
      {!evaluation && (
        <>
          <TextInput
            multiline
            placeholder="Type your answer here..."
            value={userAnswer}
            onChangeText={setUserAnswer}
            style={styles.answerInput}
          />
          <Button 
            onPress={handleSubmit}
            loading={loading}
          >
            Submit Answer
          </Button>
        </>
      )}
      
      {/* Evaluation Results */}
      {evaluation && (
        <Card>
          <Text style={styles.marksAwarded}>
            {evaluation.marks_awarded} / {evaluation.max_marks} marks
          </Text>
          
          <Divider />
          
          <Text style={styles.sectionTitle}>Feedback</Text>
          <Text>{evaluation.feedback}</Text>
          
          <Divider />
          
          <Text style={styles.sectionTitle}>✅ Strengths</Text>
          {evaluation.strengths.map(s => (
            <Text key={s}>• {s}</Text>
          ))}
          
          <Divider />
          
          <Text style={styles.sectionTitle}>📈 How to Improve</Text>
          {evaluation.improvements.map(i => (
            <Text key={i}>• {i}</Text>
          ))}
          
          <Divider />
          
          <Text style={styles.sectionTitle}>💡 Examiner Tip</Text>
          <Text>{evaluation.examiner_tip}</Text>
          
          <Button onPress={nextQuestion}>
            Next Question →
          </Button>
        </Card>
      )}
    </ScrollView>
  );
}
```

### 3. Paper Download Screen

```tsx
// src/screens/papers/PaperLibraryScreen.tsx
export default function PaperLibraryScreen() {
  const [papers, setPapers] = useState([]);
  const [filters, setFilters] = useState({
    year: null,
    series: null,
    paper: null
  });
  
  return (
    <View>
      <Text>Past Papers Library</Text>
      
      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
      />
      
      {/* Papers List */}
      <FlatList
        data={papers}
        renderItem={({ item }) => (
          <PaperCard paper={item}>
            <Button onPress={() => downloadPaper(item.question_paper_url)}>
              📄 Download Question Paper
            </Button>
            <Button onPress={() => downloadPaper(item.mark_scheme_url)}>
              ✅ Download Mark Scheme
            </Button>
            {item.examiner_report_url && (
              <Button onPress={() => downloadPaper(item.examiner_report_url)}>
                📊 Download Examiner Report
              </Button>
            )}
            <Button onPress={() => practicePaper(item.id)}>
              🎯 Practice This Paper
            </Button>
          </PaperCard>
        )}
      />
    </View>
  );
}
```

### 4. Timed Exam Mode

```tsx
// src/screens/practice/TimedExamScreen.tsx
export default function TimedExamScreen({ paperId }) {
  const [timeRemaining, setTimeRemaining] = useState(3600); // 60 minutes
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  
  useEffect(() => {
    // Start timer
    const interval = setInterval(() => {
      setTimeRemaining(t => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View>
      {/* Timer */}
      <Timer seconds={timeRemaining} />
      
      {/* Progress */}
      <ProgressBar current={currentQuestion + 1} total={questions.length} />
      
      {/* Question */}
      <QuestionDisplay 
        question={questions[currentQuestion]}
        onAnswerChange={(answer) => saveAnswer(currentQuestion, answer)}
      />
      
      {/* Navigation */}
      <View style={styles.navigation}>
        <Button onPress={previousQuestion}>← Previous</Button>
        <Button onPress={nextQuestion}>Next →</Button>
      </View>
      
      {/* Submit Button (when time expires or user finishes) */}
      {(timeRemaining === 0 || allQuestionsAnswered) && (
        <Button onPress={submitExam}>
          Submit Exam for Marking
        </Button>
      )}
    </View>
  );
}
```

---

## 🚀 IMPLEMENTATION ROADMAP

### Phase 1: Data Extraction (Week 1-2)
- [ ] Build PDF extraction pipeline
- [ ] Extract questions from 50 papers (test batch)
- [ ] Extract mark schemes
- [ ] Link questions to topics
- [ ] Validate extraction quality

### Phase 2: Database & API (Week 3)
- [ ] Create exam_papers tables
- [ ] Build API endpoints
- [ ] Test data insertion
- [ ] Create search functionality

### Phase 3: AI Generation (Week 4)
- [ ] Build question generator
- [ ] Test with various question types
- [ ] Validate generated questions
- [ ] Create feedback loop

### Phase 4: Answer Evaluation (Week 5)
- [ ] Build marking engine
- [ ] Test accuracy vs real mark schemes
- [ ] Fine-tune feedback generation
- [ ] Add examiner insights

### Phase 5: UI Components (Week 6-7)
- [ ] Practice mode screen
- [ ] Question display
- [ ] Answer evaluation display
- [ ] Paper library
- [ ] Download functionality

### Phase 6: Advanced Features (Week 8)
- [ ] Timed exam mode
- [ ] Question collections
- [ ] Progress analytics
- [ ] Smart recommendations

---

## 💰 COST ESTIMATION

### AI Processing Costs
- **Extraction:** ~$0.50 per paper (Claude Opus)
- **850 papers:** ~$425 one-time cost
- **Question Generation:** ~$0.05 per question
- **Answer Evaluation:** ~$0.10 per evaluation

### Storage Costs
- **PDFs:** Already have URLs (no storage cost)
- **Extracted Data:** ~50MB total (negligible)

### Ongoing Costs
- **Per student session:** $0.20-0.50 depending on questions
- **Monthly at 1000 users:** $200-500

**This is extremely affordable for the value provided.**

---

## ✅ SUCCESS METRICS

### Technical Success
- ✅ 95%+ accuracy in question extraction
- ✅ 90%+ accuracy in mark scheme extraction
- ✅ AI marking correlates 85%+ with real examiners

### User Success
- ✅ Students find practice questions valuable
- ✅ Feedback improves answer quality
- ✅ Exam technique improves measurably
- ✅ Students download papers regularly

---

## 🎯 QUICK START (What To Build First)

### MVP: Paper Download + Basic Practice

1. **Paper Library** (2 days)
   - List papers by subject
   - Download buttons
   - Filter by year/series

2. **Question Display** (3 days)
   - Show questions from extracted data
   - Answer input
   - Basic marking (keyword matching)

3. **Extraction Pipeline** (1 week)
   - Process 50 papers
   - Store in database
   - Test quality

**Total MVP: 2 weeks to useful feature** 🚀

---

**This is a game-changer feature.** You're turning 850+ exam papers into an interactive, intelligent learning system. No competitor has this depth of integration between real exam content and AI assistance.

Let's build this! 💪



