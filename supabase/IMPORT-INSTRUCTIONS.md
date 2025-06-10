# FLASH App - Topic Import Instructions

## Overview
You have 16,835 topics ready in the `cleaned_topics` table that need to be imported into `curriculum_topics`.

## Step-by-Step Process

### Step 1: Clear Existing Data
Since this is a dev environment with no user data, run:
```sql
DELETE FROM curriculum_topics;
```

### Step 2: Test with Small Dataset (CCEA A-Level)
Run the queries in `07-clear-and-import.sql`:
1. First run the DELETE statement
2. Then run the CCEA A-Level import (3 INSERT statements)
3. Check the results - should see around 41 topics

### Step 3: Import Remaining A-Level Exam Boards
Use `08-continue-import-alevel.sql` and run each exam board separately:
1. SQA (304 rows)
2. WJEC (1,002 rows)
3. EDEXCEL (1,352 rows)
4. AQA (2,042 rows)
5. OCR (2,511 rows)

**For each exam board**: Run the 3 INSERT statements (Modules, Topics, Sub Topics)

### Step 4: Import GCSE Topics
Use `09-import-gcse.sql` and replace `{EXAM_BOARD}` with each board:
1. SQA (363 rows)
2. WJEC (1,268 rows)
3. OCR (1,401 rows)
4. EDEXCEL (1,627 rows)
5. AQA (1,685 rows)
6. CCEA (3,239 rows)

### Step 5: Verify in App
After each exam board import:
1. Go to your FLASH app
2. Select that exam board
3. Select A-Level or GCSE
4. Select a subject
5. Check if topics appear

## Expected Final Result
You should have approximately 16,835 curriculum topics imported, matching your `cleaned_topics` table.

## If Something Goes Wrong
1. Check for error messages in Supabase
2. Run the verification queries to see what was imported
3. If needed, DELETE and start again (it's a dev environment)

## Files Created
- `07-clear-and-import.sql` - Clear and test with CCEA
- `08-continue-import-alevel.sql` - Import remaining A-Levels
- `09-import-gcse.sql` - Import all GCSE topics
- `check-essential-counts.sql` - Check current state
- This instruction file 