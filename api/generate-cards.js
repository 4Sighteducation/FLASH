const OpenAI = require('openai');

const LEGACY_MODEL_BY_TYPE = {
  essay: 'gpt-4-turbo',
  multiple_choice: 'gpt-3.5-turbo',
  short_answer: 'gpt-3.5-turbo',
  acronym: 'gpt-3.5-turbo',
};

const MODEL_ENV_BY_TYPE = {
  essay: 'OPENAI_MODEL_ESSAY',
  multiple_choice: 'OPENAI_MODEL_MULTIPLE_CHOICE',
  short_answer: 'OPENAI_MODEL_SHORT_ANSWER',
  acronym: 'OPENAI_MODEL_ACRONYM',
};

function readEnv(name) {
  const value = process.env[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveModelForQuestionType(questionType) {
  const typeEnvName = MODEL_ENV_BY_TYPE[questionType];
  const perTypeModel = typeEnvName ? readEnv(typeEnvName) : null;
  if (perTypeModel) {
    return { model: perTypeModel, source: typeEnvName };
  }

  const defaultModel = readEnv('OPENAI_MODEL_DEFAULT');
  if (defaultModel) {
    return { model: defaultModel, source: 'OPENAI_MODEL_DEFAULT' };
  }

  return {
    model: LEGACY_MODEL_BY_TYPE[questionType] || LEGACY_MODEL_BY_TYPE.multiple_choice,
    source: 'legacy_fallback',
  };
}

// Main handler function
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { subject, topic, examType, examBoard, questionType, numCards, contentGuidance, avoidQuestions, isOverview, childrenTopics } = req.body;

    // Validate required fields
    if (!subject || !topic || !examType || !examBoard || !questionType || !numCards) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['subject', 'topic', 'examType', 'examBoard', 'questionType', 'numCards']
      });
    }

    // Exam complexity guidance
    const examComplexityGuidance = {
      "A-Level": "Focus on in-depth specialized knowledge with emphasis on critical analysis, evaluation and application. Include detailed technical terminology and expect students to demonstrate independent thinking.",
      "alevel": "Focus on in-depth specialized knowledge with emphasis on critical analysis, evaluation and application. Include detailed technical terminology and expect students to demonstrate independent thinking.",
      "GCSE": "Cover foundational knowledge with clear explanations of key concepts. Focus on comprehension and basic application rather than complex analysis. Ensure terminology is appropriate for a broad introduction to the subject.",
      "gcse": "Cover foundational knowledge with clear explanations of key concepts. Focus on comprehension and basic application rather than complex analysis. Ensure terminology is appropriate for a broad introduction to the subject.",
      "BTEC": "Focus on practical applications, industry standards, and vocational context.",
      "btec": "Focus on practical applications, industry standards, and vocational context.",
      "IB": "Similar to A-Level with critical thinking and application focus, but slightly broader in scope as students take six subjects. Include appropriate technical terminology while balancing depth with the wider curriculum demands.",
      "ib": "Similar to A-Level with critical thinking and application focus, but slightly broader in scope as students take six subjects. Include appropriate technical terminology while balancing depth with the wider curriculum demands.",
      "iGCSE": "Similar to GCSE but with international perspectives. Cover foundational knowledge with clear explanations.",
      "igcse": "Similar to GCSE but with international perspectives. Cover foundational knowledge with clear explanations.",
      "International GCSE": "Similar to GCSE but with international perspectives. Cover foundational knowledge with clear explanations.",
      "International A-Level": "Similar to A-Level with international curriculum. Focus on in-depth knowledge with critical analysis and evaluation.",
      "internationalgcse": "Similar to GCSE but with international perspectives. Cover foundational knowledge with clear explanations.",
      "internationalalevel": "Similar to A-Level with international curriculum. Focus on in-depth knowledge with critical analysis and evaluation."
    };

    // Build the prompt
    const complexityGuidance = examComplexityGuidance[examType] || examComplexityGuidance["GCSE"];
    
    let prompt;
    
    // Different prompts for overview vs specific cards
    if (isOverview && childrenTopics && childrenTopics.length > 0) {
      // OVERVIEW CARDS - Compare/contrast subtopics
      prompt = `Generate ${numCards} OVERVIEW flashcards for ${examBoard} ${examType} ${subject} on the parent topic: "${topic}".

This parent topic encompasses these subtopics: ${childrenTopics.join(', ')}.

DIFFICULTY LEVEL: ${complexityGuidance}

OVERVIEW CARD REQUIREMENTS:
1. DO NOT ask specific detailed questions about individual subtopics (those exist in separate cards).
2. FOCUS ON: Comparisons, relationships, connections, and the big picture.
3. Generate questions that help students understand how the ${childrenTopics.length} subtopics relate to each other.
4. Include questions like:
   - "Compare and contrast [subtopic A] and [subtopic B]"
   - "How does [subtopic] relate to [another subtopic]?"
   - "What's the relationship between these ${childrenTopics.length} concepts?"
   - "When would you use [subtopic A] vs [subtopic B]?"
5. Help students see the strategic/big picture view of "${topic}".
6. Ensure content is appropriate for ${examType} level students.
`;
    } else {
      // SPECIFIC CARDS - Deep dive into topic
      prompt = `Generate ${numCards} high-quality flashcards for ${examBoard} ${examType} ${subject} on "${topic}".
    
DIFFICULTY LEVEL: ${complexityGuidance}

SPECIFIC INSTRUCTIONS:
1. Each flashcard must be directly relevant to "${topic}" specifically.
2. Include exam-specific terminology and concepts.
3. Ensure content is appropriate for ${examType} level students.
4. Where possible use questions similar to those found in ${examType} exams for ${examBoard}
`;
    }

    // Add question type specific guidance
    switch (questionType) {
      case 'multiple_choice':
        prompt += `
CONTENT GUIDANCE:
- Create challenging yet fair multiple choice questions
- Provide exactly 4 COMPLETE options (NOT just single letters!)
- Each option must be a full phrase or sentence (e.g., "Deontology", not just "D")
- Return options as plain text only (do NOT prefix with a)/b)/c)/d) or A./B./C./D.)
- Distribute the correct answer randomly among the four positions
- All four options should be plausible and related to ${topic}
- DO NOT include placeholder options like "E" or single letters
- Provide detailed explanations that would help a student understand the concept
`;
        break;
      case 'short_answer':
        prompt += `
CONTENT GUIDANCE:
- Questions should require concise, focused answers
- KeyPoints should list exactly what an examiner would look for (2-4 points)
- DetailedAnswer should provide a comprehensive explanation with examples
`;
        break;
      case 'essay':
        prompt += `
CONTENT GUIDANCE:
- Questions should match typical ${examType} essay question styles
- KeyPoints should reflect main arguments and essay structure needed for top marks
- Include ${examType}-appropriate evaluation and analysis guidance
- DetailedAnswer should provide elaborate explanation suitable for deeper understanding
`;
        break;
      case 'acronym':
        prompt += `
CONTENT GUIDANCE:
- Create memorable acronyms for key concepts
- Question: Ask what the acronym stands for or its relevance
- Acronym: The acronym itself
- Explanation: What each letter stands for with detailed explanation
`;
        break;
    }

    if (contentGuidance) {
      prompt += `\n\nADDITIONAL GUIDANCE (treat this as a priority across the FULL set, not just one card): ${contentGuidance}`;
      prompt += `\n- Every card should clearly reflect this guidance unless doing so would make the set repetitive or inaccurate.`;
      prompt += `\n- Do not limit the guidance to only the first card.`;
    }

    if (Array.isArray(avoidQuestions) && avoidQuestions.length > 0) {
      const trimmedAvoid = avoidQuestions
        .map((q) => String(q || '').trim())
        .filter(Boolean)
        .slice(0, 20);

      if (trimmedAvoid.length > 0) {
        prompt += `\n\nAVOID REPEATING THESE EXISTING OR PREVIOUSLY GENERATED QUESTIONS:`;
        trimmedAvoid.forEach((question, index) => {
          prompt += `\n${index + 1}. ${question}`;
        });
        prompt += `\nGenerate fresh questions that cover different angles of the topic.`;
      }
    }

    // Define the function schema based on question type
    let cardSchema = {
      type: "object",
      properties: {
        question: { type: "string", description: "The question for the flashcard" }
      },
      required: ["question"]
    };

    // Add type-specific properties
    switch (questionType) {
      case 'multiple_choice':
        cardSchema.properties.options = {
          type: "array",
          items: { type: "string" },
          description: "Four answer options"
        };
        cardSchema.properties.correctAnswer = {
          type: "string",
          description: "The correct answer (must match one option exactly)"
        };
        cardSchema.properties.detailedAnswer = {
          type: "string",
          description: "Detailed explanation of the answer"
        };
        cardSchema.required.push("options", "correctAnswer", "detailedAnswer");
        break;
      case 'short_answer':
        cardSchema.properties.keyPoints = {
          type: "array",
          items: { type: "string" },
          description: "2-4 key points for the answer"
        };
        cardSchema.properties.detailedAnswer = {
          type: "string",
          description: "Comprehensive answer with examples"
        };
        cardSchema.required.push("keyPoints", "detailedAnswer");
        break;
      case 'essay':
        cardSchema.properties.keyPoints = {
          type: "array",
          items: { type: "string" },
          description: "Main essay points and structure"
        };
        cardSchema.properties.detailedAnswer = {
          type: "string",
          description: "Detailed essay guidance and content"
        };
        cardSchema.required.push("keyPoints", "detailedAnswer");
        break;
      case 'acronym':
        cardSchema.properties.acronym = {
          type: "string",
          description: "The acronym itself"
        };
        cardSchema.properties.explanation = {
          type: "string",
          description: "What each letter stands for with explanation"
        };
        cardSchema.required.push("acronym", "explanation");
        break;
    }

    const { model: selectedModel, source: modelSource } = resolveModelForQuestionType(questionType);

    console.log('[generate-cards] model selection', {
      questionType,
      selectedModel,
      modelSource,
    });

    // Call OpenAI API - REVERT TO ORIGINAL WORKING METHOD
    const systemMessage = `You are an expert ${examType} ${subject} educator. Create precise, high-quality flashcards that match ${examBoard} standards.`;
    
    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      functions: [{
        name: 'generateFlashcards',
        description: `Generate ${numCards} flashcards`,
        parameters: {
          type: "object",
          properties: {
            cards: {
              type: "array",
              items: cardSchema
            }
          },
          required: ["cards"]
        }
      }],
      function_call: { name: 'generateFlashcards' },
      temperature: questionType === 'essay' ? 0.9 : questionType === 'short_answer' ? 0.85 : 0.75,
      max_tokens: questionType === 'essay' ? 4000 : Math.min(3000, numCards * 250)
    });

    // Parse the response - ORIGINAL METHOD
    let functionArgs;
    if (completion.choices?.[0]?.message?.function_call) {
      try {
        functionArgs = JSON.parse(completion.choices[0].message.function_call.arguments);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError.message);
        throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
      }

      if (functionArgs && functionArgs.cards && Array.isArray(functionArgs.cards)) {
        const stripMcqLabel = (raw) => {
          let s = typeof raw === 'string' ? raw : String(raw ?? '');
          // Remove one or more leading labels like "a) ", "A. ", "B - ", "c: "
          // Apply repeatedly to handle accidental double-labels.
          for (let i = 0; i < 3; i++) {
            const next = s.replace(/^\s*[A-Da-d]\s*[).:-]\s*/u, '');
            if (next === s) break;
            s = next;
          }
          return s.trim();
        };
        const norm = (x) => String(x ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

        // Process and return the cards
        const processedCards = functionArgs.cards.map(card => {
          const processedCard = {
            question: card.question || 'No question generated'
          };

          switch (questionType) {
            case 'multiple_choice':
              // Filter out invalid options (single letters, empty strings, etc.)
              const rawOptions = Array.isArray(card.options) ? card.options : [];
              // Defensive: models sometimes return non-string options (objects/numbers/null).
              // Normalize to strings and drop obviously-bad values.
              const normalizedOptions = rawOptions
                .map((opt) => {
                  if (typeof opt === 'string') return opt;
                  if (opt == null) return '';
                  if (typeof opt === 'number' || typeof opt === 'boolean') return String(opt);
                  if (typeof opt === 'object') {
                    // Common structured shapes from some model/tooling variants
                    if (typeof opt.text === 'string') return opt.text;
                    if (typeof opt.value === 'string') return opt.value;
                    if (typeof opt.option === 'string') return opt.option;
                    return '';
                  }
                  return '';
                })
                .map((s) => s.trim())
                .filter(Boolean)
                .filter((s) => s !== '[object Object]');

              // Strip any letter labels (sometimes duplicated) so UI can render its own A/B/C/D consistently.
              let cleanedOptions = normalizedOptions
                .map(stripMcqLabel)
                .map((s) => s.trim())
                .filter(Boolean)
                .filter((s) => s.length > 1 && s.toLowerCase() !== 'e' && s.toLowerCase() !== 'option');

              // De-dupe while preserving order (by normalized text)
              const seen = new Set();
              cleanedOptions = cleanedOptions.filter((s) => {
                const k = norm(s);
                if (!k) return false;
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              });

              let cleanedCorrect = typeof card.correctAnswer === 'string' ? card.correctAnswer : String(card.correctAnswer || '');
              cleanedCorrect = stripMcqLabel(cleanedCorrect);

              // Ensure correct answer matches one of the options as closely as possible.
              const correctNorm = norm(cleanedCorrect);
              if (correctNorm) {
                const idx = cleanedOptions.findIndex((o) => norm(o) === correctNorm);
                if (idx >= 0) {
                  cleanedCorrect = cleanedOptions[idx];
                }
              }

              // Ensure exactly 4 options while trying to keep the correct answer included.
              if (cleanedOptions.length > 4) {
                const idx = correctNorm ? cleanedOptions.findIndex((o) => norm(o) === correctNorm) : -1;
                if (idx >= 0 && idx >= 4) {
                  cleanedOptions = [...cleanedOptions.slice(0, 3), cleanedOptions[idx]];
                } else {
                  cleanedOptions = cleanedOptions.slice(0, 4);
                }
              }

              processedCard.options = cleanedOptions;
              processedCard.correctAnswer = cleanedCorrect;
              processedCard.detailedAnswer = typeof card.detailedAnswer === 'string' ? card.detailedAnswer : String(card.detailedAnswer || '');
              
              // Ensure we have exactly 4 options
              while (processedCard.options.length < 4) {
                processedCard.options.push(`Option ${processedCard.options.length + 1}`);
              }
              break;
            case 'short_answer':
            case 'essay':
              processedCard.keyPoints = card.keyPoints || [];
              processedCard.detailedAnswer = card.detailedAnswer || '';
              processedCard.answer = processedCard.keyPoints.join('\n• ');
              break;
            case 'acronym':
              processedCard.acronym = card.acronym || '';
              processedCard.explanation = card.explanation || '';
              processedCard.answer = `${processedCard.acronym}\n\n${processedCard.explanation}`;
              break;
          }

          return processedCard;
        });

        const seenQuestions = new Set();
        const uniqueCards = processedCards.filter((card) => {
          const key = String(card.question || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '');
          if (!key || seenQuestions.has(key)) return false;
          seenQuestions.add(key);
          return true;
        });

        return res.status(200).json({ 
          success: true,
          cards: uniqueCards 
        });
      }
    }

    throw new Error('Invalid response format from AI');
  } catch (error) {
    console.error('Error generating cards:', error);
    return res.status(500).json({ 
      error: 'Failed to generate cards',
      message: error.message 
    });
  }
} 