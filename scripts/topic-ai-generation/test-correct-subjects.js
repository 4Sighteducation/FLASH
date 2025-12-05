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
  
  const startTime = Date.now();
  
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
      console.log(`   📚 ${topic.plain_english_summary.substring(0, 150)}...`);
      console.log(`   🎯 Confidence: ${confidence.toFixed(1)}%`);
      console.log(`   📊 Difficulty: ${topic.difficulty_band}`);
      console.log(`   🏫 ${topic.exam_board} ${topic.qualification_level} - ${topic.subject_name}`);
      console.log();
    });
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Test with CORRECT subject names
async function runTests() {
  console.log('🧪 TESTING WITH CORRECT SUBJECT NAMES');
  console.log('═'.repeat(60));
  
  // Test 1: Biology GCSE from Edexcel
  await testSearch('photosynthesis', { 
    subject_name: 'Biology (GCSE)',
    exam_board: 'Edexcel'
  });
  
  // Test 2: Physics from Edexcel
  await testSearch('forces and motion', { 
    subject_name: 'Physics (GCSE)',
    exam_board: 'Edexcel'
  });
  
  // Test 3: Mathematics from Edexcel
  await testSearch('quadratic equations', { 
    subject_name: 'Mathematics (GCSE)',
    exam_board: 'Edexcel'
  });
  
  // Test 4: Combined Science (has lots of content)
  await testSearch('photosynthesis', { 
    subject_name: 'Combined Science (GCSE)',
    exam_board: 'Edexcel'
  });
  
  // Test 5: A-Level Biology
  await testSearch('photosynthesis', { 
    exam_board: 'Edexcel',
    qualification_level: 'A_LEVEL'
  });
  
  console.log('\n✅ Tests complete!');
  console.log('\n💡 KEY INSIGHT:');
  console.log('Subject names include qualification in parentheses!');
  console.log('e.g., "Biology (GCSE)" not just "Biology"');
}

runTests();









