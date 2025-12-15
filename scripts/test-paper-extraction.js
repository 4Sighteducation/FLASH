/**
 * TEST PAPER EXTRACTION
 * 
 * Tests AI extraction of questions from exam papers
 * Run: node scripts/test-paper-extraction.js
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Test paper: OCR Biology A, June 2024, Paper 3
const TEST_PAPER = {
  name: 'OCR Biology A - June 2024 - Paper 3',
  questionUrl: 'https://www.ocr.org.uk/Images/726692-question-paper-unified-biology.pdf',
  markSchemeUrl: 'https://www.ocr.org.uk/Images/726819-mark-scheme-unified-biology.pdf',
  examinerReportUrl: 'https://www.ocr.org.uk/Images/726425-examiners-report-unified-biology.pdf',
  expectedTotalMarks: 70,
  expectedDuration: 90, // minutes
};

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Download PDF to temporary file
 */
async function downloadPDF(url, filename) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(__dirname, 'temp', filename);
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }

    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filePath);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

/**
 * Extract questions from PDF using Claude
 */
async function extractQuestions(pdfPath) {
  console.log('\n📄 Reading PDF...');
  
  // Read PDF as base64
  const pdfData = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfData.toString('base64');
  
  console.log('🤖 Sending to Claude for extraction...\n');
  
  const prompt = `You are an expert at extracting exam questions from PDF papers.

Extract ALL questions from this exam paper. For each question, provide:

1. Question number (e.g., "1", "2(a)", "3(ii)")
2. Full question text (complete sentence)
3. Marks allocated (the number in square brackets)
4. Command word (e.g., "Describe", "Explain", "Calculate", "Evaluate")
5. Question type: "multiple_choice", "short_answer", or "extended_response"
6. Any context/stem text provided before the question

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
    "question_type": "short_answer",
    "context_text": null
  },
  {
    "question_number": "2(a)",
    "question_text": "Calculate the magnification of the image.",
    "marks": 2,
    "command_word": "Calculate",
    "question_type": "short_answer",
    "context_text": "Figure 1 shows an electron micrograph of a mitochondrion."
  }
]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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

    // Extract JSON from response
    const responseText = response.content[0].text;
    
    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    
    const questions = JSON.parse(jsonMatch[0]);
    
    return {
      questions,
      rawResponse: responseText,
      usage: response.usage,
    };
  } catch (error) {
    console.error('❌ Extraction failed:', error.message);
    throw error;
  }
}

/**
 * Display results in readable format
 */
function displayResults(result) {
  const { questions, usage } = result;
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 EXTRACTION RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Extracted ${questions.length} questions\n`);
  
  // Group by main question number
  const grouped = {};
  questions.forEach(q => {
    const mainNum = q.question_number.split(/[a-z(]/)[0];
    if (!grouped[mainNum]) grouped[mainNum] = [];
    grouped[mainNum].push(q);
  });
  
  // Display each question
  Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(mainNum => {
    const qs = grouped[mainNum];
    
    console.log('─'.repeat(80));
    console.log(`\n📝 QUESTION ${mainNum}:`);
    
    qs.forEach(q => {
      console.log(`\n   ${q.question_number}) ${q.question_text}`);
      console.log(`   📊 Marks: ${q.marks} | 🎯 Type: ${q.command_word} (${q.question_type})`);
      if (q.context_text) {
        console.log(`   📄 Context: ${q.context_text.substring(0, 100)}...`);
      }
    });
    console.log();
  });
  
  console.log('─'.repeat(80));
  
  // Summary stats
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const commandWords = {};
  questions.forEach(q => {
    commandWords[q.command_word] = (commandWords[q.command_word] || 0) + 1;
  });
  
  console.log('\n📈 SUMMARY STATISTICS:');
  console.log(`   Total Questions: ${questions.length}`);
  console.log(`   Total Marks: ${totalMarks} (Expected: ${TEST_PAPER.expectedTotalMarks})`);
  console.log(`   Match: ${totalMarks === TEST_PAPER.expectedTotalMarks ? '✅' : '❌'}`);
  
  console.log('\n   Command Words Used:');
  Object.entries(commandWords).forEach(([word, count]) => {
    console.log(`   - ${word}: ${count}`);
  });
  
  console.log('\n💰 API USAGE:');
  console.log(`   Input tokens: ${usage.input_tokens.toLocaleString()}`);
  console.log(`   Output tokens: ${usage.output_tokens.toLocaleString()}`);
  console.log(`   Estimated cost: $${((usage.input_tokens * 0.003 / 1000) + (usage.output_tokens * 0.015 / 1000)).toFixed(4)}`);
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Save results to JSON file for review
 */
function saveResults(result) {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `extraction-test-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify({
    paper: TEST_PAPER,
    extractedAt: new Date().toISOString(),
    questions: result.questions,
    usage: result.usage,
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${filepath}`);
}

/**
 * Main test function
 */
async function runTest() {
  console.log('🧪 EXAM PAPER EXTRACTION TEST');
  console.log('='.repeat(80));
  console.log(`\n📄 Test Paper: ${TEST_PAPER.name}`);
  console.log(`🔗 URL: ${TEST_PAPER.questionUrl}\n`);
  
  try {
    // Step 1: Download PDF
    console.log('⬇️  Downloading PDF...');
    const pdfPath = await downloadPDF(TEST_PAPER.questionUrl, 'test-paper.pdf');
    console.log(`✅ Downloaded to: ${pdfPath}`);
    
    // Step 2: Extract questions
    const result = await extractQuestions(pdfPath);
    
    // Step 3: Display results
    displayResults(result);
    
    // Step 4: Save results
    saveResults(result);
    
    console.log('\n✅ Test complete! Review the results above.\n');
    console.log('📋 Next steps:');
    console.log('   1. Open the actual PDF and compare questions');
    console.log('   2. Check if all questions were found');
    console.log('   3. Verify marks are correct');
    console.log('   4. Note any missing or incorrect extractions');
    console.log('   5. We\'ll adjust the prompt based on your feedback\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runTest();
}

module.exports = { extractQuestions, downloadPDF };

