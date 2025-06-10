# SQL Schema Analysis

## Issues Found and Fixes Required

### 1. **Missing Foreign Key Constraints**
The following tables are missing foreign key constraints:
- `flashcards.topic_id` → should reference `curriculum_topics(id)`
- `user_topics.topic_id` → should reference `curriculum_topics(id)`
- `user_subjects.subject_id` → should reference `exam_board_subjects(id)`

### 2. **Missing Unique Constraints**
To prevent duplicate entries, these tables need unique constraints:
- `user_topics` → needs UNIQUE(user_id, topic_id)
- `user_subjects` → needs UNIQUE(user_id, subject_id)
- `user_achievements` → already has UNIQUE constraint in schema.sql

### 3. **Missing Indexes**
For better query performance, these indexes should be added:
- `curriculum_topics(exam_board_subject_id)`
- `curriculum_topics(parent_topic_id)`
- `exam_board_subjects(exam_board_id)`
- `user_custom_topics(subject_id)`
- `user_custom_topics(original_topic_id)`

### 4. **Cascade Delete Issues**
Most foreign keys don't have `ON DELETE CASCADE`, which could cause issues when deleting users or related records. All user-related foreign keys should cascade delete.

### 5. **Missing Check Constraints**
Data integrity constraints needed:
- `curriculum_topics.topic_level` → should be >= 0
- `curriculum_topics.teaching_hours` → should be >= 0
- `curriculum_topics.assessment_weight` → should be between 0 and 100

### 6. **Missing Row Level Security (RLS)**
The following tables don't have RLS enabled:
- `exam_boards`
- `exam_board_subjects`
- `qualification_types`
- `curriculum_topics`

These should have RLS enabled with appropriate policies (at minimum, allow all authenticated users to read).

### 7. **Missing Update Triggers**
Tables with `updated_at` columns but no update triggers:
- `exam_boards`
- `exam_board_subjects`
- `curriculum_topics`

### 8. **Potential Issues**
- The `curriculum_topics` table has a self-referencing foreign key (`parent_topic_id`), which is correct but needs careful handling during inserts/deletes
- The `user_custom_topics` table doesn't have a foreign key to `curriculum_topics` for `original_topic_id`, which might be intentional if topics can be deleted

## Recommendations

1. **Run the fixes in order**: Apply constraints after ensuring data integrity
2. **Backup first**: Always backup your database before running schema modifications
3. **Test in development**: Run these fixes in a development environment first
4. **Consider data migration**: If you have existing data that violates these constraints, you'll need to clean it up first

## Application Impact

After applying these fixes:
- The app's data integrity will be much stronger
- Deleting users will properly cascade to all related records
- Query performance will improve with the new indexes
- RLS policies will ensure proper data access control

The fixes in `schema-fixes.sql` address all these issues and can be run on your Supabase database to improve the schema. 