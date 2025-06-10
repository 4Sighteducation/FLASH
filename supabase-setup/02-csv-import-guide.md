# CSV Import Guide for Supabase

## 📊 Step-by-Step Import Process

### 1. In Supabase Dashboard:
1. Go to your project: **flashcards**
2. Navigate to **Table Editor**
3. First, run the schema creation SQL (from enhanced-database-schema.sql)
4. Then run the seed data SQL (01-seed-exam-boards.sql)

### 2. Import Process:

#### Option A: Direct CSV Import (Easiest)
1. Click **Import data from CSV**
2. Select target table: `curriculum_topics`
3. Upload your CSV file
4. Map columns:
   ```
   Knack Field → Supabase Field
   Exam Board → (will need to convert to exam_board_id)
   Exam Type → (will need to convert to qualification_type_id)
   Subject → subject_name
   Module → (parent topic with level=1)
   Topic → topic_name (level=2)
   Sub Topic → topic_name (level=3)
   ```

#### Option B: Using SQL with Temporary Table (More Control)
```sql
-- 1. Create temporary import table
CREATE TABLE temp_knack_import (
    exam_board TEXT,
    exam_type TEXT,
    subject TEXT,
    module TEXT,
    topic TEXT,
    sub_topic TEXT,
    field_3034 TEXT, -- Keep original field references
    field_3035 TEXT,
    field_3033 TEXT,
    field_3036 TEXT,
    field_3037 TEXT,
    field_3038 TEXT
);

-- 2. Import CSV into temp table via Supabase UI

-- 3. Transform and insert into proper tables
-- First, create exam_board_subjects
INSERT INTO exam_board_subjects (exam_board_id, qualification_type_id, subject_name, subject_code)
SELECT DISTINCT 
    eb.id,
    qt.id,
    t.subject,
    t.field_3033 -- Using Knack's subject code
FROM temp_knack_import t
JOIN exam_boards eb ON UPPER(t.exam_board) = eb.code
JOIN qualification_types qt ON UPPER(REPLACE(t.exam_type, ' ', '_')) = qt.code
ON CONFLICT DO NOTHING;

-- 4. Insert modules (level 1 topics)
INSERT INTO curriculum_topics (exam_board_subject_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id,
    t.module,
    t.field_3036,
    1, -- Module level
    ROW_NUMBER() OVER (PARTITION BY ebs.id ORDER BY t.module)
FROM temp_knack_import t
JOIN exam_boards eb ON UPPER(t.exam_board) = eb.code
JOIN qualification_types qt ON UPPER(REPLACE(t.exam_type, ' ', '_')) = qt.code
JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = t.subject
WHERE t.module IS NOT NULL;

-- 5. Insert topics (level 2)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id,
    parent.id,
    t.topic,
    t.field_3037,
    2, -- Topic level
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY t.topic)
FROM temp_knack_import t
JOIN exam_boards eb ON UPPER(t.exam_board) = eb.code
JOIN qualification_types qt ON UPPER(REPLACE(t.exam_type, ' ', '_')) = qt.code
JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = t.subject
JOIN curriculum_topics parent ON parent.exam_board_subject_id = ebs.id 
    AND parent.topic_name = t.module 
    AND parent.topic_level = 1
WHERE t.topic IS NOT NULL;

-- 6. Insert subtopics (level 3)
INSERT INTO curriculum_topics (exam_board_subject_id, parent_topic_id, topic_name, topic_code, topic_level, sort_order)
SELECT DISTINCT
    ebs.id,
    parent.id,
    t.sub_topic,
    t.field_3038,
    3, -- Subtopic level
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY t.sub_topic)
FROM temp_knack_import t
JOIN exam_boards eb ON UPPER(t.exam_board) = eb.code
JOIN qualification_types qt ON UPPER(REPLACE(t.exam_type, ' ', '_')) = qt.code
JOIN exam_board_subjects ebs ON ebs.exam_board_id = eb.id 
    AND ebs.qualification_type_id = qt.id 
    AND ebs.subject_name = t.subject
JOIN curriculum_topics module ON module.exam_board_subject_id = ebs.id 
    AND module.topic_name = t.module 
    AND module.topic_level = 1
JOIN curriculum_topics parent ON parent.exam_board_subject_id = ebs.id 
    AND parent.parent_topic_id = module.id
    AND parent.topic_name = t.topic 
    AND parent.topic_level = 2
WHERE t.sub_topic IS NOT NULL;

-- 7. Clean up
DROP TABLE temp_knack_import;
```

### 3. Verify Import:
```sql
-- Check import counts
SELECT 
    'Exam Board Subjects' as table_name, 
    COUNT(*) as count 
FROM exam_board_subjects
UNION ALL
SELECT 
    'Modules (Level 1)', 
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 1
UNION ALL
SELECT 
    'Topics (Level 2)', 
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 2
UNION ALL
SELECT 
    'Subtopics (Level 3)', 
    COUNT(*) 
FROM curriculum_topics WHERE topic_level = 3;

-- Sample data check
SELECT 
    eb.code as exam_board,
    qt.code as qualification,
    ebs.subject_name,
    ct.topic_name,
    ct.topic_level
FROM curriculum_topics ct
JOIN exam_board_subjects ebs ON ct.exam_board_subject_id = ebs.id
JOIN exam_boards eb ON ebs.exam_board_id = eb.id
JOIN qualification_types qt ON ebs.qualification_type_id = qt.id
LIMIT 20;
```

## 🔧 Common Issues & Fixes:

### 1. Character Encoding
If you see weird characters:
```bash
# Convert CSV to UTF-8
iconv -f ISO-8859-1 -t UTF-8 knack_export.csv > knack_export_utf8.csv
```

### 2. Large File (>100MB)
Split the CSV:
```bash
# Split into 10,000 row chunks
split -l 10000 knack_export.csv chunk_
```

### 3. Duplicate Handling
The SQL includes `ON CONFLICT DO NOTHING` to skip duplicates.

## 🚀 Next Steps After Import:

1. **Set up Supabase client in your Expo app**
2. **Create API endpoints for topic selection**
3. **Build the topic selector UI**
4. **Test with real curriculum data**

Would you like help with any of these steps? 