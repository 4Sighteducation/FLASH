/**
 * TEST PAPER EXTRACTION - Using Firecrawl + OpenAI
 * 
 * Firecrawl extracts PDF text, OpenAI structures it
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const TEST_PAPER_URL = 'https://www.ocr.org.uk/Images/726692-question-paper-unified-biology.pdf';

  console.log('🧪 Test extraction with Firecrawl + OpenAI');

  try {
    // Step 1: Extract PDF text with Firecrawl
    console.log('🔥 Using Firecrawl to extract PDF...');
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: TEST_PAPER_URL,
        formats: ['markdown', 'html'],
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      throw new Error(`Firecrawl failed: ${firecrawlResponse.status} ${errorText}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    const extractedText = firecrawlData.data?.markdown || firecrawlData.data?.content || '';
    
    console.log(`✅ Extracted ${extractedText.length} characters`);

    if (!extractedText || extractedText.length < 100) {
      throw new Error('PDF extraction returned too little text');
    }

    // Step 2: Structure with OpenAI
    console.log('🤖 Sending to GPT-4o for structuring...');
    
    const prompt = `You are an expert at extracting exam questions from exam paper text.

Extract ALL questions from this OCR Biology A-Level exam paper.

For each question provide:
1. Question number (e.g., "1", "2(a)", "3(ii)")
2. Full question text
3. Marks (number in square brackets like [4])
4. Command word (Describe, Explain, Calculate, etc.)
5. Question type: "multiple_choice", "short_answer", or "extended_response"

CRITICAL:
- Extract EVERY question and sub-part
- Don't skip any
- Preserve exact wording
- If you see [4] that means 4 marks

Return ONLY valid JSON array:
[
  {
    "question_number": "1",
    "question_text": "Describe the structure...",
    "marks": 4,
    "command_word": "Describe",
    "question_type": "short_answer"
  }
]

EXAM PAPER TEXT:
${extractedText}`;

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
            content: prompt,
          }
        ],
        max_tokens: 16000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      throw new Error(`OpenAI error: ${openaiResponse.status} ${errorData}`);
    }

    const openaiData = await openaiResponse.json();
    const responseText = openaiData.choices[0].message.content;
    
    // Parse JSON
    const parsed = JSON.parse(responseText);
    const questions = parsed.questions || (Array.isArray(parsed) ? parsed : []);
    
    if (questions.length === 0) {
      throw new Error('No questions extracted');
    }
    
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    
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
        questions: questions.slice(0, 5), // Show first 5 for preview
        allQuestions: questions, // Full list
      },
      usage: {
        promptTokens: openaiData.usage.prompt_tokens,
        completionTokens: openaiData.usage.completion_tokens,
        totalTokens: openaiData.usage.total_tokens,
      },
      debug: {
        extractedTextLength: extractedText.length,
        extractedTextPreview: extractedText.substring(0, 500),
      }
    });

  } catch (error) {
    console.error('❌ Failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}

