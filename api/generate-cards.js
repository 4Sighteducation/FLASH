const OpenAI = require('openai');

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

    const { subject, topic, examType, examBoard, questionType, numCards, contentGuidance, isOverview, childrenTopics } = req.body;

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
- Label options as a), b), c), d)
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
- Questions should match typical ${examType} essay question styles (e.g., "Evaluate...", "To what extent...", "Assess...")
- Each card MUST include:
  * question: The essay question
  * keyPoints: Array of 4-6 main arguments/essay structure points
  * detailedAnswer: Comprehensive essay guidance with examples
- KeyPoints should reflect main arguments and essay structure needed for top marks
- Include ${examType}-appropriate evaluation and analysis guidance
- DetailedAnswer should provide elaborate explanation suitable for deeper understanding

IMPORTANT: Return ALL ${numCards} cards in the JSON response.
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
      prompt += `\n\nADDITIONAL GUIDANCE: ${contentGuidance}`;
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

    // Call OpenAI API
    const systemMessage = `You are an expert ${examType} ${subject} educator. Create precise, high-quality flashcards that match ${examBoard} standards.`;
    
    // Update prompt to request JSON format explicitly
    const jsonPrompt = prompt + `\n\nReturn the response in the following JSON format:\n${JSON.stringify({cards: [cardSchema]}, null, 2)}`;
    
    console.log('🤖 Calling OpenAI with model:', questionType === 'essay' ? 'gpt-4o-mini' : 'gpt-3.5-turbo');
    
    const completion = await openai.chat.completions.create({
      model: questionType === 'essay' ? 'gpt-4o-mini' : 'gpt-3.5-turbo',  // Faster and more reliable
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: jsonPrompt }
      ],
      response_format: { type: "json_object" },  // Force JSON mode
      temperature: 0.7,
      max_tokens: questionType === 'essay' ? 3500 : Math.min(3000, numCards * 250)
    });
    
    console.log('✅ OpenAI response received, parsing...');

    // Parse the response
    if (completion.choices?.[0]?.message?.content) {
      let functionArgs;
      try {
        const responseContent = completion.choices[0].message.content;
        console.log('📄 Raw response length:', responseContent.length);
        console.log('📄 First 500 chars:', responseContent.substring(0, 500));
        
        // Try parsing the JSON
        functionArgs = JSON.parse(responseContent);
        console.log('✅ JSON parsed successfully');
        console.log('📊 Cards found:', functionArgs.cards?.length || 0);
      } catch (parseError) {
        console.error('❌ JSON parsing error:', parseError.message);
        console.error('Raw content:', completion.choices[0].message.content);
        
        // Try to fix common JSON issues
        try {
          let fixedContent = completion.choices[0].message.content;
          // Remove markdown code blocks if present
          fixedContent = fixedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          // Trim whitespace
          fixedContent = fixedContent.trim();
          functionArgs = JSON.parse(fixedContent);
          console.log('✅ Fixed JSON successfully');
        } catch (fixError) {
          console.error('❌ Could not fix JSON:', fixError.message);
          throw new Error(`Invalid JSON response from AI: ${parseError.message}`);
        }
      }
      
      if (functionArgs.cards && Array.isArray(functionArgs.cards) && functionArgs.cards.length > 0) {
        console.log('🎴 Processing', functionArgs.cards.length, 'cards...');
        console.log('📋 First card raw data:', JSON.stringify(functionArgs.cards[0]));
        
        // Process and return the cards
        const processedCards = functionArgs.cards.map((card, index) => {
          console.log(`\n🔍 Processing card ${index + 1}:`, JSON.stringify(card));
          
          const processedCard = {
            question: card.question || 'No question generated'
          };
          
          console.log(`   Question extracted: ${processedCard.question.substring(0, 50)}...`);

          switch (questionType) {
            case 'multiple_choice':
              // Filter out invalid options (single letters, empty strings, etc.)
              const rawOptions = card.options || [];
              processedCard.options = rawOptions.filter(opt => {
                const trimmed = opt.trim();
                // Keep options that are:
                // - More than 2 characters (exclude "E", "a)", etc.)
                // - OR start with a letter followed by ) (like "a) Something")
                return trimmed.length > 2 || /^[a-d]\)/.test(trimmed.toLowerCase());
              });
              
              processedCard.correctAnswer = card.correctAnswer || '';
              processedCard.detailedAnswer = card.detailedAnswer || '';
              
              // Ensure we have exactly 4 options
              while (processedCard.options.length < 4) {
                processedCard.options.push(`Option ${processedCard.options.length + 1}`);
              }
              break;
            case 'short_answer':
            case 'essay':
              // Handle different possible field names from AI
              processedCard.keyPoints = card.keyPoints || card.key_points || card.keypoints || [];
              processedCard.detailedAnswer = card.detailedAnswer || card.detailed_answer || card.detailedanswer || '';
              processedCard.answer = (processedCard.keyPoints.length > 0) 
                ? processedCard.keyPoints.join('\n• ') 
                : 'Answer not generated';
              
              console.log(`   Essay/SA - keyPoints: ${processedCard.keyPoints.length}, detailedAnswer: ${processedCard.detailedAnswer.length} chars`);
              break;
            case 'acronym':
              processedCard.acronym = card.acronym || '';
              processedCard.explanation = card.explanation || '';
              processedCard.answer = `${processedCard.acronym}\n\n${processedCard.explanation}`;
              break;
          }

          return processedCard;
        });

        console.log('✅ Returning', processedCards.length, 'processed cards');
        return res.status(200).json({ 
          success: true,
          cards: processedCards 
        });
      } else {
        console.error('❌ No cards found in response or empty array');
        console.error('functionArgs:', JSON.stringify(functionArgs));
      }
    } else {
      console.error('❌ No content in completion response');
      console.error('completion:', JSON.stringify(completion));
    }

    throw new Error('Invalid response format from AI - no cards generated');
  } catch (error) {
    console.error('Error generating cards:', error);
    return res.status(500).json({ 
      error: 'Failed to generate cards',
      message: error.message 
    });
  }
} 