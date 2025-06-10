-- STEP 1: PREPARE FOR IMPORT
-- This script prepares the database for importing the CSV data

-- 1.1 Create a temporary table to hold the imported CSV data
DROP TABLE IF EXISTS topics_import_temp;

CREATE TABLE topics_import_temp (
    id SERIAL PRIMARY KEY,
    "Exam Board" TEXT,
    "Exam Type" TEXT,
    "Subject" TEXT,
    "Module" TEXT,
    "Topic" TEXT,
    "Sub Topic" TEXT,
    import_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Disable foreign key checks temporarily (we'll re-enable after import)
-- This allows us to truncate tables without constraint issues

-- 1.3 Clear existing data (user confirmed this is OK)
TRUNCATE TABLE curriculum_topics CASCADE;
TRUNCATE TABLE exam_board_subjects CASCADE;
TRUNCATE TABLE user_custom_topics CASCADE;
TRUNCATE TABLE user_topics CASCADE;

-- 1.4 Log the start of import
SELECT 'Import preparation completed at ' || NOW() as status; 