# Test Paper Extraction

This script tests AI extraction of questions from exam papers.

## Setup

1. **Install dependencies:**
```bash
cd scripts
npm install
```

2. **Set your Anthropic API key:**
```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY="your-key-here"

# macOS/Linux
export ANTHROPIC_API_KEY="your-key-here"
```

## Run Test

```bash
npm test
```

Or directly:
```bash
node test-paper-extraction.js
```

## What It Does

1. Downloads the OCR Biology June 2024 Paper 3 PDF
2. Sends it to Claude for question extraction
3. Displays all extracted questions
4. Saves results to `output/extraction-test-[timestamp].json`
5. Shows usage stats and estimated cost

## Review Results

Compare the extracted questions with the actual PDF:

- ✅ All questions found?
- ✅ Question numbers correct?
- ✅ Marks correct?
- ✅ Question text complete?
- ❌ Any missing questions?
- ❌ Any incorrect data?

## Expected Output

```
📊 EXTRACTION RESULTS
==================================================

✅ Extracted X questions

─────────────────────────────────────────────

📝 QUESTION 1:

   1) Describe the structure of...
   📊 Marks: 4 | 🎯 Type: Describe (short_answer)

...

📈 SUMMARY STATISTICS:
   Total Questions: 45
   Total Marks: 70 (Expected: 70)
   Match: ✅

💰 API USAGE:
   Input tokens: ~8,000
   Output tokens: ~4,000
   Estimated cost: $0.08
```

## Next Steps

Based on test results, we'll:
1. Adjust extraction prompt if needed
2. Add validation rules
3. Build full extraction pipeline
4. Integrate into production app

