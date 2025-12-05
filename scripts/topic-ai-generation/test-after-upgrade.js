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
    
    // Call the match_topics RPC function
    const { data, error } = await supabase.rpc('match_topics', {
      query_embedding: queryEmbedding,
      p_exam_board: filters.exam_board || null,
      p_qualification_level: filters.qualification_level || null,
      p_subject_name: filters.subject_name || null,
      p_limit: 5
    });
    
    const searchTime = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Search error:', error);
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

// Performance test
async function performanceTest() {
  console.log('\n⚡ PERFORMANCE TEST');
  console.log('═'.repeat(60));
  
  const queries = [
    'photosynthesis',
    'quadratic equations',
    'World War 2',
    'Shakespeare plays',
    'chemical reactions'
  ];
  
  const times = [];
  
  for (const query of queries) {
    const start = Date.now();
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });
    
    const { data, error } = await supabase.rpc('match_topics', {
      query_embedding: embeddingResponse.data[0].embedding,
      p_limit: 10
    });
    
    const time = Date.now() - start;
    times.push(time);
    
    console.log(`✓ "${query}": ${time}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n📊 Average response time: ${avg.toFixed(0)}ms`);
}

// Run comprehensive tests
async function runTests() {
  console.log('🧪 TESTING AI TOPIC SEARCH (POST-UPGRADE)');
  console.log('═'.repeat(60));
  
  // Test 1: Biology search
  await testSearch('how do plants make food from sunlight');
  
  // Test 2: Math with filters
  await testSearch('solving quadratic equations step by step', {
    exam_board: 'AQA',
    qualification_level: 'GCSE'
  });
  
  // Test 3: History A-Level
  await testSearch('causes and consequences of World War 2', {
    qualification_level: 'A_LEVEL'
  });
  
  // Test 4: Physics concept
  await testSearch('forces and motion Newton laws', {
    subject_name: 'Physics'
  });
  
  // Test 5: Chemistry GCSE
  await testSearch('acids bases and pH scale', {
    exam_board: 'Edexcel',
    qualification_level: 'GCSE'
  });
  
  // Performance test
  await performanceTest();
  
  console.log('\n✅ All tests complete!');
  console.log('\nNext steps:');
  console.log('1. If all searches work: Your upgrade was successful!');
  console.log('2. Response times should be < 500ms');
  console.log('3. Ready to integrate into your app!');
}

runTests();









