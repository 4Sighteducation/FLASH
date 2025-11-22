import { generateEmbeddings, withRetry } from './openai-client.js';
import { config } from '../config.js';
import pLimit from 'p-limit';

/**
 * Build searchable text for embedding from topic context
 */
function buildEmbeddingText(topic) {
  const parts = [
    // Primary identifiers (helps with exact matches)
    `${topic.qualification_level} ${topic.subject_name}`,
    topic.exam_board,
    
    // Hierarchical path (helps with context)
    topic.full_path.join(' → '),
    
    // The topic itself (main content)
    topic.topic_name,
    
    // Code for exact matches (e.g., "3.4.2")
    topic.topic_code,
  ];
  
  return parts.filter(Boolean).join(' | ');
}

/**
 * Generate embeddings for all topics in batches
 */
export async function generateAllEmbeddings(topics, progressCallback) {
  const batchSize = config.batch.embeddingBatchSize;
  const limit = pLimit(config.batch.maxConcurrency);
  const results = [];
  
  console.log(`🧠 Generating embeddings (batches of ${batchSize})...`);
  
  // Split into batches
  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize);
    const texts = batch.map(buildEmbeddingText);
    
    // Generate embeddings for this batch
    const promise = limit(async () => {
      try {
        const embeddings = await withRetry(() => generateEmbeddings(texts));
        
        const batchResults = batch.map((topic, idx) => ({
          topic_id: topic.topic_id,
          embedding: embeddings[idx],
          subject_name: topic.subject_name,
          exam_board: topic.exam_board,
          qualification_level: topic.qualification_level,
          topic_level: topic.topic_level,
          full_path: topic.full_path,
        }));
        
        if (progressCallback) {
          progressCallback(Math.min(i + batch.length, topics.length), topics.length);
        }
        
        return batchResults;
      } catch (error) {
        console.error(`\n❌ Failed batch ${i}-${i + batch.length}:`, error.message);
        throw error;
      }
    });
    
    results.push(promise);
  }
  
  const batches = await Promise.all(results);
  return batches.flat();
}

