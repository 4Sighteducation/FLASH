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
  if (filters.exam_board) console.log(`   Board: ${filters.exam_board}`);
  if (filters.qualification_level) console.log(`   Level: ${filters.qualification_level}`);
  if (filters.subject_name) console.log(`   Subject: ${filters.subject_name}`);
  console.log('━'.repeat(60));
  
  try {
    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: searchQuery
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Call the match_topics RPC function
    const { data, error } = await supabase.rpc('match_topics', {
      query_embedding: queryEmbedding,
      p_exam_board: filters.exam_board || null,
      p_qualification_level: filters.qualification_level || null,
      p_subject_name: filters.subject_name || null,
      p_limit: 5
    });
    
    if (error) {
      console.error('❌ Search error:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No results found');
      return;
    }
    
    console.log(`\n✅ Found ${data.length} results:\n`);
    
    data.forEach((topic, i) => {
      const confidence = (1 - topic.similarity) * 100;
      console.log(`${i + 1}. ${topic.full_path.join(' > ')}`);
      console.log(`   📚 ${topic.plain_english_summary}`);
      console.log(`   🎯 Confidence: ${confidence.toFixed(1)}%`);
      console.log(`   📊 Difficulty: ${topic.difficulty_band || 'Not set'}`);
      console.log(`   ⚡ Importance: ${topic.exam_importance ? (topic.exam_importance * 100).toFixed(0) + '%' : 'Not set'}`);
      console.log(`   🏫 ${topic.exam_board} ${topic.qualification_level} ${topic.subject_name}`);
      console.log();
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run test searches
async function runTests() {
  console.log('🧪 TESTING AI TOPIC SEARCH');
  console.log('═'.repeat(60));
  
  // Test 1: General search
  await testSearch('photosynthesis');
  
  // Test 2: Filtered search
  await testSearch('quadratic equations', {
    exam_board: 'AQA',
    qualification_level: 'GCSE'
  });
  
  // Test 3: Natural language search
  await testSearch('how do plants make food');
  
  // Test 4: Specific subject search
  await testSearch('World War 2 causes', {
    subject_name: 'History'
  });
  
  // Test 5: Complex topic
  await testSearch('differentiation and integration techniques', {
    qualification_level: 'A_LEVEL'
  });
  
  console.log('\n✅ Tests complete!');
}

runTests();











