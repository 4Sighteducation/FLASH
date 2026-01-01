-- Check if user_topics_with_progress view exists and what columns it has

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_topics_with_progress'
ORDER BY ordinal_position;

-- If it's a view, check its definition
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname = 'user_topics_with_progress';


