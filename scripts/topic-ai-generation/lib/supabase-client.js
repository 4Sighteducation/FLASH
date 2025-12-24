import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  const details = (err?.details || '').toLowerCase();
  // Supabase client uses fetch/undici. These are typically transient (pooler/IO spikes).
  return (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('socket') ||
    details.includes('fetch failed') ||
    details.includes('und_err_socket') ||
    details.includes('other side closed') ||
    details.includes('connection') ||
    details.includes('ssl')
  );
}

async function withRetries(fn, { retries = 6, baseDelayMs = 750, maxDelayMs = 15_000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableNetworkError(err) || err?.code === '57014' || (err?.message || '').includes('timeout');
      if (!retryable || attempt === retries) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      console.warn(`\n  ⚠️ Transient error (attempt ${attempt + 1}/${retries + 1}). Retrying in ${Math.round(delay / 1000)}s...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Fetch all topics needing metadata - WITH PAGINATION
 * Handles Supabase row limits by fetching in chunks
 */
export async function fetchTopicsNeedingMetadata(filters = {}) {
  const allTopics = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  console.log('📥 Fetching topics needing metadata...');
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    let query = supabase
      .from('topics_with_context')
      .select('*')
      .range(from, to)
      .order('topic_id');
    
    // Apply filters if provided
    if (filters.examBoard) {
      query = query.eq('exam_board', filters.examBoard);
    }
    if (filters.subject) {
      query = query.eq('subject_name', filters.subject);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      allTopics.push(...data);
      
      if (page === 0 || allTopics.length % 5000 === 0) {
        console.log(`  Fetched ${allTopics.length} topics...`);
      }
      
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  console.log(`  Total fetched: ${allTopics.length} topics\n`);
  
  // Filter to only topics without existing metadata
  const existingIds = await getExistingMetadataIds();
  const topicsNeedingMetadata = allTopics.filter(t => !existingIds.has(t.topic_id));
  
  console.log(`  ${existingIds.size} already have metadata`);
  console.log(`  ${topicsNeedingMetadata.length} need processing\n`);
  
  return topicsNeedingMetadata;
}

/**
 * Check which topics already have metadata - WITH PAGINATION
 */
export async function getExistingMetadataIds() {
  const ids = new Set();
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;
  
  while (hasMore) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await supabase
      .from('topic_ai_metadata')
      .select('topic_id')
      .range(from, to);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      data.forEach(d => ids.add(d.topic_id));
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }
  
  return ids;
}

/**
 * Upsert topic metadata in batches with timeout handling
 */
export async function upsertTopicMetadata(metadataArray) {
  // Much smaller chunks to avoid Supabase timeouts with large embeddings
  const CHUNK_SIZE = Math.max(1, Math.min(200, config.batch.upsertChunkSize || 20));
  
  if (metadataArray.length > CHUNK_SIZE) {
    console.log(`  Saving ${metadataArray.length} topics in chunks of ${CHUNK_SIZE}...`);
    
    for (let i = 0; i < metadataArray.length; i += CHUNK_SIZE) {
      const chunk = metadataArray.slice(i, Math.min(i + CHUNK_SIZE, metadataArray.length));
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      const totalChunks = Math.ceil(metadataArray.length / CHUNK_SIZE);
      
      process.stdout.write(`  Chunk ${chunkNum}/${totalChunks}... `);
      const { error } = await withRetries(
        async () =>
          supabase
            .from('topic_ai_metadata')
            .upsert(chunk, { onConflict: 'topic_id' }),
        { retries: 6 }
      );
      
      if (error) {
        console.error(`\n  ⚠️ Error in chunk ${chunkNum}:`, error.message);
        
        // If timeout, try even smaller batches
        if (error.code === '57014' || error.message.includes('timeout') || isRetryableNetworkError(error)) {
          console.log('  Retrying with tiny batches...');
          for (let j = 0; j < chunk.length; j += 5) {
            const miniChunk = chunk.slice(j, Math.min(j + 5, chunk.length));
            const { error: retryError } = await withRetries(
              async () =>
                supabase
                  .from('topic_ai_metadata')
                  .upsert(miniChunk, { onConflict: 'topic_id' }),
              { retries: 6 }
            );
            
            if (retryError) {
              // Try one by one as last resort
              console.log('  Trying one by one...');
              for (const item of miniChunk) {
                const { error: singleError } = await withRetries(
                  async () =>
                    supabase
                      .from('topic_ai_metadata')
                      .upsert([item], { onConflict: 'topic_id' }),
                  { retries: 6 }
                );
                
                if (singleError) {
                  console.error(`  Single item failed:`, singleError.message);
                  // Continue anyway to save what we can
                }
              }
            }
          }
          console.log('  Retry complete.');
        } else {
          throw error;
        }
      } else {
        process.stdout.write('✓\n');
      }
    }
  } else {
    // Small batch, save directly
    const { error } = await withRetries(
      async () =>
        supabase
          .from('topic_ai_metadata')
          .upsert(metadataArray, { onConflict: 'topic_id' }),
      { retries: 6 }
    );
    
    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }
  }
}

/**
 * Get statistics about current metadata coverage
 */
export async function getMetadataStats() {
  const { data, error } = await supabase.rpc('get_topics_needing_metadata');
  
  if (error) throw error;
  
  const totalTopics = (await supabase.from('curriculum_topics').select('id', { count: 'exact', head: true })).count;
  const withMetadata = totalTopics - data.length;
  
  return {
    totalTopics,
    withMetadata,
    needingMetadata: data.length,
    coveragePercent: ((withMetadata / totalTopics) * 100).toFixed(1)
  };
}

