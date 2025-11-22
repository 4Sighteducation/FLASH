import OpenAI from 'openai';
import { config } from '../config.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate embeddings for multiple texts in one API call
 */
export async function generateEmbeddings(texts) {
  try {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: texts,
      encoding_format: 'float',
    });
    
    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Embedding generation error:', error.message);
    throw error;
  }
}

/**
 * Generate AI summary and difficulty for a single topic
 */
export async function generateTopicSummary(topicData, systemPrompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.completionModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(topicData) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    
    const result = JSON.parse(completion.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Summary generation error:', error.message);
    throw error;
  }
}

/**
 * Retry wrapper for API calls
 */
export async function withRetry(fn, attempts = config.batch.retryAttempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      
      const delay = config.batch.retryDelayMs * Math.pow(2, i);
      console.log(`  Retry ${i + 1}/${attempts} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

