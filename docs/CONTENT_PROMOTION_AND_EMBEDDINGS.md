## Overview
This doc explains the **safe, incremental** workflow for:
- Fixing a subject’s curriculum in **staging**
- Promoting that subject into **production** without re-running everything
- Regenerating only the required **topic embeddings / AI metadata** (pgvector)

It’s designed for the common support scenario:
> “Student reports missing / weird topics for Subject X”

## Key tables (production Supabase project)
- **`exam_board_subjects`**: subjects (per exam board + qualification)
- **`curriculum_topics`**: the topic tree per subject
- **`topic_ai_metadata`**: embeddings + AI summaries for semantic topic search (`vector(1536)`)
- **`topics_with_context`** (view): convenient flattened topics + path context (used to generate metadata)

## Why topics can look “missing”
If scraped `topic_name` values are poor (e.g. `"1"`), parts of the app previously collapsed levels when `parent.topic_name === child.topic_name`.
That can visually hide real topic structure even though the rows exist.

We’ve hardened the collapse heuristic in the app, but you should still fix bad scraped names in staging and promote clean data into prod.

## Recommended support workflow (incremental)
### 1) Reproduce and identify the exact subject instance
Subjects are **per exam board** and **qualification**.
Capture:
- Exam board code (e.g. `Edexcel`)
- Qualification code (e.g. `A_LEVEL`)
- Subject code / name (from `exam_board_subjects`)

### 2) Fix the data in staging
Use the curriculum pipeline repo (`flash-curriculum-pipeline`) to scrape/clean into staging tables.
Confirm in staging viewer that:
- topic tree depth is correct (levels, parents)
- topic names are meaningful (not just numbers)
- expected topic counts match the spec

### 3) Promote ONLY that subject into production (no full migration)
**Goal**: update *one* `exam_board_subjects` row + replace that subject’s `curriculum_topics`.

Approach:
- Find the production `exam_board_subjects.id` for the subject (or upsert it)
- Delete prod `curriculum_topics` for just that subject id
- Insert the staging topics for just that subject (keeping UUIDs stable if your pipeline does)
- Update parent relationships (second pass)

> You can adapt the existing SQL in `flash-curriculum-pipeline/database/migrations/migrate-staging-to-production.sql`
> by **scoping** it to a single subject (filter by `subject_code` and `qualification_type`).

### 4) Regenerate embeddings ONLY for that subject
Embeddings live in `public.topic_ai_metadata` and are keyed by `topic_id`.

If topics changed, the safest approach is:
- Delete `topic_ai_metadata` rows for the affected subject
- Recreate them only for topics in that subject using `topics_with_context`

Because `topic_ai_metadata.topic_id` references `curriculum_topics(id)` with `ON DELETE CASCADE`,
deleting topics will already remove embeddings for those topic IDs — but if IDs are reused, you still need to regenerate updated embeddings.

## “How do we generate embeddings?”
The app uses:
- `match_topics()` RPC (vector search)
- `search-topics` edge function as a fallback

### Practical option (recommended): one-command per-subject regen
Use the pipeline helper script:
- `flash-curriculum-pipeline/scripts/promote_subject_and_embeddings.py`

Example:

```bash
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\flash-curriculum-pipeline"
export SUPABASE_URL="https://YOURPROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export OPENAI_API_KEY="YOUR_OPENAI_KEY"
python scripts/promote_subject_and_embeddings.py --exam-board Edexcel --qualification A_LEVEL --subject-name "Physical Education" --generate-embeddings
```

This:
- upserts the subject in `exam_board_subjects`
- replaces `curriculum_topics` for that subject from staging
- regenerates `topic_ai_metadata` only for that subject

