# Complete Import Process for FLASH Topics

## Overview
This process imports 16,836 records from your CSV file into the Supabase database, creating proper relationships between exam boards, qualification types, subjects, and topics.

## Prerequisites
- Access to Supabase dashboard
- CSV file: `topics (2).csv` with columns: "Exam Board", "Exam Type", "Subject", "Module", "Topic", "Sub Topic"

## Step-by-Step Process

### 1. Upload CSV to Supabase
1. Go to your Supabase dashboard
2. Navigate to the Table Editor
3. Click "New Table" → "Import from CSV"
4. Name the table: `topics_import_temp`
5. Upload your `topics (2).csv` file
6. Make sure column names match exactly (with quotes and spaces)

### 2. Run SQL Scripts in Order

#### Script 1: Prepare Import (`01-prepare-import.sql`)
- Creates the temporary import table structure
- Clears existing data (as confirmed)
- Run this ONLY if you didn't create the table via CSV import

#### Script 2: Clean & Transform (`02-clean-transform-data.sql`)
- Standardizes exam board codes (uppercase)
- Converts exam types (e.g., "A Level" → "A_LEVEL")
- Removes empty rows
- Shows summary of what will be imported

#### Script 3: Populate Subjects (`03-populate-subjects.sql`)
- Creates entries in `exam_board_subjects` table
- Links subjects to exam boards and qualification types
- Creates unique combinations for each exam board + qualification + subject

#### Script 4: Populate Topics (`04-populate-topics.sql`)
- Creates the hierarchical topic structure:
  - Level 1: Modules
  - Level 2: Topics
  - Level 3: Sub Topics
- Maintains parent-child relationships
- Sets proper sort orders

### 3. Verify Import
After running all scripts, verify:
```sql
-- Check total subjects by qualification type
SELECT 
    qt.code as qualification_type,
    COUNT(DISTINCT ebs.id) as subject_count
FROM exam_board_subjects ebs
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
GROUP BY qt.code;

-- Check A-Level subjects specifically
SELECT COUNT(*) FROM exam_board_subjects ebs
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
WHERE qt.code = 'A_LEVEL';

-- Check total curriculum topics
SELECT COUNT(*) FROM curriculum_topics;
```

### 4. Clean Up
```sql
-- Drop the temporary import table
DROP TABLE topics_import_temp;
```

## Expected Results
- Multiple qualification types (GCSE, A_LEVEL, etc.)
- Subjects for each exam board and qualification type
- ~16,836 curriculum topics in hierarchical structure
- App will now show subjects for all qualification types

## Troubleshooting
- If exam boards don't match: Check the `exam_boards` table for exact codes
- If qualification types don't match: Update the CASE statement in script 2
- If topics are missing: Check for NULL values in Module/Topic/SubTopic columns 