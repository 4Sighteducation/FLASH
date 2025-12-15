/**
 * TEST PAPER EXTRACTION - OpenAI Version
 * Using GPT-4o Vision which we know works
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const TEST_PAPER_URL = 'https://www.ocr.org.uk/Images/726692-question-paper-unified-biology.pdf';

  console.log('🧪 Starting extraction with OpenAI...');

  try {
    // Download PDF
    console.log('⬇️ Downloading PDF...');
    const pdfResponse = await fetch(TEST_PAPER_URL);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    
    console.log(`✅ Downloaded (${(pdfBuffer.byteLength / 1024).toFixed(1)} KB)`);

    // Call OpenAI with PDF as base64 data URL
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert at extracting exam questions from PDF papers.

Extract ALL questions from this exam paper. For each question, provide:

1. Question number (e.g., "1", "2(a)", "3(ii)")
2. Full question text
3. Marks allocated (number in square brackets)
4. Command word (e.g., "Describe", "Explain", "Calculate")
5. Question type: "multiple_choice", "short_answer", or "extended_response"

IMPORTANT:
- Extract EVERY question and sub-question
- Don't skip any
- Preserve exact wording

Return ONLY valid JSON array:
[
  {
    "question_number": "1",
    "question_text": "Describe...",
    "marks": 4,
    "command_word": "Describe",
    "question_type": "short_answer"
  }
]`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 16000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorData}`);
    }

    const result = await openaiResponse.json();
    const responseText = result.choices[0].message.content;
    
    // Parse JSON
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    
    const commandWords = {};
    questions.forEach(q => {
      commandWords[q.command_word] = (commandWords[q.command_word] || 0) + 1;
    });

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
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens,
      },
    });

  } catch (error) {
    console.error('❌ Failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

