-- Option 1: If you know your CSV headers, create table with exact column names
-- Replace these with your actual CSV column headers
CREATE TABLE IF NOT EXISTS temp_knack_import (
    id SERIAL PRIMARY KEY,
    "Exam Board" TEXT,
    "Exam Type" TEXT,
    "Subject" TEXT,
    "Module" TEXT,
    "Topic" TEXT,
    "Sub Topic" TEXT,
    "field_3034" TEXT,
    "field_3035" TEXT,
    "field_3033" TEXT,
    "field_3036" TEXT,
    "field_3037" TEXT,
    "field_3038" TEXT
);

-- Option 2: After importing with generic columns, rename them
-- First, check what Supabase imported:
SELECT * FROM temp_knack_import LIMIT 1;

-- Then rename columns to match (example):
ALTER TABLE temp_knack_import 
RENAME COLUMN column1 TO exam_board;

ALTER TABLE temp_knack_import 
RENAME COLUMN column2 TO exam_type;

ALTER TABLE temp_knack_import 
RENAME COLUMN column3 TO subject;

ALTER TABLE temp_knack_import 
RENAME COLUMN column4 TO module;

ALTER TABLE temp_knack_import 
RENAME COLUMN column5 TO topic;

ALTER TABLE temp_knack_import 
RENAME COLUMN column6 TO sub_topic;

-- Option 3: Use COPY command (if you have direct file access)
-- This is more advanced but very reliable
/*
COPY temp_knack_import(exam_board, exam_type, subject, module, topic, sub_topic)
FROM '/path/to/your/file.csv'
DELIMITER ','
CSV HEADER;
*/

-- After import, check the data:
SELECT COUNT(*) as total_rows FROM temp_knack_import;
SELECT * FROM temp_knack_import LIMIT 10; 