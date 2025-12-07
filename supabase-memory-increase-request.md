# Supabase Support Request Template

## Subject: Increase maintenance_work_mem for vector index creation

Hi Supabase Support,

I'm on the Pro plan and trying to create a vector index for 54,942 embeddings but hitting this error:

```
ERROR: 54000: memory required is 65 MB, maintenance_work_mem is 32 MB
```

**Project details:**
- Project: FLASH (or your project ref)
- Plan: Pro
- Table: topic_ai_metadata
- Rows: 54,942
- Vector dimensions: 1,536

**Request:**
Please increase `maintenance_work_mem` to at least 256MB for my database instance.

**SQL I'm trying to run:**
```sql
CREATE INDEX topic_embedding_idx ON public.topic_ai_metadata
USING hnsw (embedding vector_cosine_ops)
WITH (m = 24, ef_construction = 200);
```

Thanks!











