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
  
  const startTime = Date.now();
  
  try {
    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: searchQuery
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Use the FAST function
    const { data, error } = await supabase.rpc('match_topics_fast', {
      query_embedding: queryEmbedding,
      p_exam_board: filters.exam_board || null,
      p_qualification_level: filters.qualification_level || null,
      p_subject_name: filters.subject_name || null,
      p_limit: 5
    });
    
    const searchTime = Date.now() - startTime;
    
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No results found');
      return;
    }
    
    console.log(`✅ Found ${data.length} results in ${searchTime}ms:\n`);
    
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

// Run tests
async function runTests() {
  console.log('🧪 TESTING FAST VECTOR SEARCH');
  console.log('═'.repeat(60));
  
  // Test WITHOUT filters (these were timing out)
  console.log('\n📌 GENERAL SEARCHES (no filters):');
  await testSearch('photosynthesis');
  await testSearch('World War 2');
  await testSearch('differentiation calculus');
  
  // Test WITH filters (these already work)
  console.log('\n📌 FILTERED SEARCHES:');
  await testSearch('quadratic equations', {
    exam_board: 'AQA',
    qualification_level: 'GCSE'
  });
  
  await testSearch('Shakespeare', {
    qualification_level: 'A_LEVEL'
  });
  
  console.log('\n✅ Tests complete!');
  console.log('\n💡 If general searches still timeout:');
  console.log('   1. Run the SQL fixes above');
  console.log('   2. Consider always requiring at least one filter');
  console.log('   3. Or use text search for general queries');
}

runTests();
