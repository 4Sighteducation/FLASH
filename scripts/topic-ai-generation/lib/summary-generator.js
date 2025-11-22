import { generateTopicSummary, withRetry } from './openai-client.js';
import { TOPIC_SUMMARY_SYSTEM_PROMPT } from '../prompts/topic-summary-prompt.js';
import { config } from '../config.js';
import pLimit from 'p-limit';

/**
 * Generate AI summary for a single topic
 */
async function generateSingleSummary(topic) {
  const topicData = {
    course: {
      level: topic.qualification_level,
      board: topic.exam_board,
      subject: topic.subject_name,
    },
    topic: {
      id: topic.topic_id,
      title: topic.topic_name,
      code: topic.topic_code,
      level: topic.topic_level,
      path: topic.full_path,
    }
  };
  
  try {
    const result = await withRetry(() => 
      generateTopicSummary(topicData, TOPIC_SUMMARY_SYSTEM_PROMPT)
    );
    return result;
  } catch (error) {
    console.error(`\n❌ Failed to generate summary for "${topic.topic_name}":`, error.message);
    
    // Return fallback
    return {
      topic_id: topic.topic_id,
      summary: `Study topic: ${topic.topic_name}. Part of ${topic.subject_name} curriculum.`,
      difficulty_band: 'standard',
      exam_importance: 0.5,
      reasoning: 'Fallback due to API error'
    };
  }
}

/**
 * Generate summaries for all topics with rate limiting
 */
export async function generateAllSummaries(topics, progressCallback) {
  const limit = pLimit(config.batch.maxConcurrency);
  const results = [];
  
  console.log(`📝 Generating AI summaries (max ${config.batch.maxConcurrency} concurrent)...`);
  
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    
    const promise = limit(async () => {
      const summary = await generateSingleSummary(topic);
      
      if (progressCallback) {
        progressCallback(i + 1, topics.length);
      }
      
      return summary;
    });
    
    results.push(promise);
  }
  
  return await Promise.all(results);
}

