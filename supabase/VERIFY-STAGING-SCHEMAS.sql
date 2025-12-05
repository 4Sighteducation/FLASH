-- Quick check: Do staging schemas exist?
SELECT 
  table_schema,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema LIKE 'staging_%'
GROUP BY table_schema;

-- If this returns 0 rows, the schemas weren't created
-- Run SIMPLE-CLEAN-START.sql again

