/**
 * TEST PAPER EXTRACTION - Vercel Function
 * 
 * Access: https://your-app.vercel.app/api/test-extraction
 */

const Anthropic = require('@anthropic-ai/sdk');

const TEST_PAPER_URL = 'https://www.ocr.org.uk/Images/726692-question-paper-unified-biology.pdf';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🧪 Starting extraction test...');

  try {
    // Download PDF
    console.log('⬇️ Downloading PDF...');
    const pdfResponse = await fetch(TEST_PAPER_URL);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    
    console.log(`✅ Downloaded PDF (${(pdfBuffer.byteLength / 1024).toFixed(1)} KB)`);

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Extract questions
    console.log('🤖 Sending to Claude...');
    
    const prompt = `You are an expert at extracting exam questions from PDF papers.

Extract ALL questions from this exam paper. For each question, provide:

1. Question number (e.g., "1", "2(a)", "3(ii)")
2. Full question text (complete sentence)
3. Marks allocated (the number in square brackets)
4. Command word (e.g., "Describe", "Explain", "Calculate", "Evaluate")
5. Question type: "multiple_choice", "short_answer", or "extended_response"

IMPORTANT RULES:
- Extract EVERY question and sub-question (1, 1a, 1b, 1(i), 1(ii), etc.)
- Include the complete question text
- Don't skip any questions
- If a question has multiple parts, list each part separately
- Preserve the exact wording

Return ONLY valid JSON array in this format:
[
  {
    "question_number": "1",
    "question_text": "Describe the structure of a cell membrane.",
    "marks": 4,
    "command_word": "Describe",
    "question_type": "short_answer"
  }
]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Parse response
    const responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    // Calculate stats
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const commandWords = {};
    questions.forEach(q => {
      commandWords[q.command_word] = (commandWords[q.command_word] || 0) + 1;
    });

    // Return results
    return res.status(200).json({
      success: true,
      paper: {
        name: 'OCR Biology A - June 2024 - Paper 3',
        url: TEST_PAPER_URL,
        expectedMarks: 70,
      },
      extraction: {
        questionsFound: questions.length,
        totalMarks,
        marksMatch: totalMarks === 70,
        commandWords,
        questions,
      },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        estimatedCost: ((response.usage.input_tokens * 0.003 / 1000) + (response.usage.output_tokens * 0.015 / 1000)).toFixed(4),
      },
    });

  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

