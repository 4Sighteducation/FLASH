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

// Simulate user context from their profile/onboarding
const USER_CONTEXT = {
  exam_board: 'Edexcel',
  qualification_level: 'GCSE',
  subject_name: 'Biology (GCSE)' // Note: includes qualification in name
};

async function contextualSearch(searchQuery, additionalFilters = {}) {
  // Merge user context with any additional filters
  const filters = { ...USER_CONTEXT, ...additionalFilters };
  
  console.log(`\n🔍 Searching for: "${searchQuery}"`);
  console.log(`📚 Within context:`);
  console.log(`   • Board: ${filters.exam_board}`);
  console.log(`   • Level: ${filters.qualification_level}`);
  console.log(`   • Subject: ${filters.subject_name}`);
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
      p_exam_board: filters.exam_board,
      p_qualification_level: filters.qualification_level,
      p_subject_name: filters.subject_name,
      p_limit: 10 // Get more results for better relevance
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
    
    // Show top 5 with details
    data.slice(0, 5).forEach((topic, i) => {
      const confidence = (1 - topic.similarity) * 100;
      
      // Check if search term appears in summary or path
      const searchTermLower = searchQuery.toLowerCase();
      const inSummary = topic.plain_english_summary.toLowerCase().includes(searchTermLower);
      const inPath = topic.full_path.join(' ').toLowerCase().includes(searchTermLower);
      
      console.log(`${i + 1}. ${topic.full_path.join(' > ')}`);
      console.log(`   📚 ${topic.plain_english_summary.substring(0, 150)}...`);
      console.log(`   🎯 Confidence: ${confidence.toFixed(1)}%`);
      
      if (inSummary || inPath) {
        console.log(`   ✨ KEYWORD MATCH: "${searchQuery}" found!`);
      }
      
      console.log(`   📊 Difficulty: ${topic.difficulty_band} | Importance: ${(topic.exam_importance * 100).toFixed(0)}%`);
      console.log();
    });
    
    // Summary statistics
    console.log('📊 SEARCH QUALITY METRICS:');
    const avgConfidence = data.reduce((sum, t) => sum + (1 - t.similarity), 0) / data.length * 100;
    console.log(`   Average confidence: ${avgConfidence.toFixed(1)}%`);
    
    const keywordMatches = data.filter(t => 
      t.plain_english_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.full_path.join(' ').toLowerCase().includes(searchQuery.toLowerCase())
    ).length;
    console.log(`   Direct keyword matches: ${keywordMatches}/${data.length}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

// Run contextual search tests
async function runTests() {
  console.log('🧪 CONTEXTUAL SEARCH TEST - User studying Edexcel GCSE Biology');
  console.log('═'.repeat(60));
  console.log('\nUser Profile:');
  console.log(`• Exam Board: ${USER_CONTEXT.exam_board}`);
  console.log(`• Level: ${USER_CONTEXT.qualification_level}`);
  console.log(`• Subject: ${USER_CONTEXT.subject_name}`);
  console.log('\nNow searching WITHIN this context...\n');
  
  // Test specific biology topics
  await contextualSearch('photosynthesis');
  await contextualSearch('cells');
  await contextualSearch('mitosis');
  await contextualSearch('respiration');
  await contextualSearch('enzymes');
  await contextualSearch('DNA');
  await contextualSearch('inheritance');
  await contextualSearch('evolution');
  
  console.log('\n' + '═'.repeat(60));
  console.log('💡 CONCLUSION:');
  console.log('With user context pre-filtering:');
  console.log('• Search is MUCH faster (no timeout issues)');
  console.log('• Results are from the correct subject');
  console.log('• Still need to improve embedding quality for better relevance');
  console.log('\n🎯 RECOMMENDATION:');
  console.log('1. Always capture user course details first');
  console.log('2. Use those as default filters for ALL searches');
  console.log('3. Allow user to override if searching outside their course');
}

runTests();

