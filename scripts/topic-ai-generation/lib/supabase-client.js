import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

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
 * Upsert topic metadata in batches
 */
export async function upsertTopicMetadata(metadataArray) {
  const { error } = await supabase
    .from('topic_ai_metadata')
    .upsert(metadataArray, { onConflict: 'topic_id' });
  
  if (error) {
    console.error('Upsert error:', error);
    throw error;
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

