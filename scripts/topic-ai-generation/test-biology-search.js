import { config } from './config.js';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

async function testSearch(searchQuery, filters = {}) {
  console.log(`\n🔍 Searching for: "${searchQuery}"`);
  if (filters.subject_name) console.log(`   Subject: ${filters.subject_name}`);
  if (filters.exam_board) console.log(`   Board: ${filters.exam_board}`);
  console.log('━'.repeat(60));
  
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: searchQuery
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    const { data, error } = await supabase.rpc('match_topics', {
      query_embedding: queryEmbedding,
      p_exam_board: filters.exam_board || null,
      p_qualification_level: filters.qualification_level || null,
      p_subject_name: filters.subject_name || null,
      p_limit: 5
    });
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No results found');
      return;
    }
    
    console.log(`✅ Found ${data.length} results:\n`);
    
    data.forEach((topic, i) => {
      const confidence = (1 - topic.similarity) * 100;
      console.log(`${i + 1}. ${topic.full_path.join(' > ')}`);
      console.log(`   📚 ${topic.plain_english_summary}`);
      console.log(`   🎯 Confidence: ${confidence.toFixed(1)}%`);
      console.log(`   🏫 ${topic.exam_board} ${topic.qualification_level} ${topic.subject_name}`);
      console.log();
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Test with subject filters
async function runTests() {
  console.log('🧪 TESTING SEARCH WITH SUBJECT FILTERS');
  console.log('═'.repeat(60));
  
  // Should find biology topics
  await testSearch('photosynthesis', { 
    subject_name: 'Biology' 
  });
  
  // Should find physics topics
  await testSearch('forces and motion', { 
    subject_name: 'Physics' 
  });
  
  // Should find chemistry topics
  await testSearch('acids and bases', { 
    subject_name: 'Chemistry' 
  });
  
  // Should find math topics
  await testSearch('quadratic equations', { 
    subject_name: 'Mathematics' 
  });
  
  // Try combined filters
  await testSearch('photosynthesis', { 
    subject_name: 'Biology',
    exam_board: 'AQA',
    qualification_level: 'GCSE'
  });
  
  console.log('\n✅ Tests complete!');
  console.log('\n💡 Observations:');
  console.log('- Filtered searches should return much better results');
  console.log('- Always include at least subject_name for accuracy');
  console.log('- General searches without filters will be poor quality');
}

runTests();
