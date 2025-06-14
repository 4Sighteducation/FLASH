const OpenAI = require('openai');

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

    const { spokenAnswer, correctAnswer, cardType, keyPoints } = req.body;

    // Validate required fields
    if (!spokenAnswer || !correctAnswer || !cardType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['spokenAnswer', 'correctAnswer', 'cardType']
      });
    }

    // Build the analysis prompt
    let systemPrompt = `You are an expert educational assessor grading student answers. Analyze the student's spoken answer compared to the correct answer. Be encouraging but accurate. Consider that this is a spoken answer, so minor grammatical issues or filler words should be ignored. Grade based on actual exam standards.`;

    let userPrompt = `Card Type: ${cardType}
Question Context: Educational flashcard
Student's Spoken Answer: "${spokenAnswer}"
Correct Answer: "${correctAnswer}"`;

    if (keyPoints && keyPoints.length > 0) {
      userPrompt += `\nKey Points Expected: ${keyPoints.join(', ')}`;
    }

    userPrompt += `\n\nAnalyze the student's answer and provide:
1. Whether the answer would pass (60%+ grade)
2. A confidence score (0-100%) representing the grade percentage:
   - 90-100: Excellent answer (A*/9)
   - 80-89: Very good answer (A/7-8)
   - 70-79: Good answer (B/6)
   - 60-69: Satisfactory answer (C/5)
   - 50-59: Below pass but shows understanding (D/4)
   - 40-49: Limited understanding (E/3)
   - Below 40: Insufficient answer
3. Constructive feedback focusing on what they did well and how to improve
4. Which key points were covered (if applicable)
5. Which key points were missed (if applicable)
6. Specific suggestions for improvement (if needed)`;

    // Define the function schema for structured output
    const analysisSchema = {
      name: 'analyzeAnswer',
      description: 'Analyze a student\'s spoken answer',
      parameters: {
        type: 'object',
        properties: {
          isCorrect: {
            type: 'boolean',
            description: 'Whether the answer is substantially correct'
          },
          confidence: {
            type: 'number',
            description: 'Confidence score from 0-100'
          },
          feedback: {
            type: 'string',
            description: 'Constructive feedback for the student'
          },
          keyPointsCovered: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key points that were covered'
          },
          keyPointsMissed: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key points that were missed'
          },
          suggestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Suggestions for improvement'
          }
        },
        required: ['isCorrect', 'confidence', 'feedback']
      }
    };

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      functions: [analysisSchema],
      function_call: { name: 'analyzeAnswer' },
      temperature: 0.3,
      max_tokens: 500
    });

    // Parse the response
    if (completion.choices?.[0]?.message?.function_call) {
      const analysis = JSON.parse(completion.choices[0].message.function_call.arguments);
      
      // Ensure all required fields are present
      const result = {
        isCorrect: analysis.isCorrect || false,
        confidence: Math.min(100, Math.max(0, analysis.confidence || 0)),
        feedback: analysis.feedback || 'Unable to analyze answer',
        keyPointsCovered: analysis.keyPointsCovered || [],
        keyPointsMissed: analysis.keyPointsMissed || [],
        suggestions: analysis.suggestions || []
      };

      return res.status(200).json({ 
        success: true,
        analysis: result
      });
    }

    throw new Error('Invalid response format from AI');
  } catch (error) {
    console.error('Error analyzing answer:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze answer',
      message: error.message 
    });
  }
}; 