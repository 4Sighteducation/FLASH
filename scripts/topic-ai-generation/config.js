import dotenv from 'dotenv';
dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: 'text-embedding-3-small', // $0.02 per 1M tokens
    completionModel: 'gpt-4o-mini',           // $0.15 per 1M input tokens
  },
  batch: {
    embeddingBatchSize: 100,    // Process 100 embeddings per API call
    windowSize: 2000,           // Process 2000 topics per window (memory management)
    maxConcurrency: 5,          // Max parallel API calls
    upsertBatchSize: 500,       // Upsert 500 rows at a time to Supabase
    // Chunk size for each actual Supabase upsert() call. Smaller is more reliable on Supabase,
    // larger is faster if your instance/pooler is stable. Can be overridden at runtime:
    //   $env:TOPIC_AI_UPSERT_CHUNK_SIZE="50"
    upsertChunkSize: Number(process.env.TOPIC_AI_UPSERT_CHUNK_SIZE || 20),
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
  pilot: {
    enabled: process.argv.includes('--pilot'),
    topicLimit: 200,
    board: 'AQA',
    subject: 'Biology',
  },
  dryRun: process.argv.includes('--dry-run'),
};

