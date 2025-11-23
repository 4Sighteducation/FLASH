import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

console.log('🔍 Testing all connections and APIs...\n');

// Test 1: Environment variables
console.log('1️⃣ Checking environment variables...');
const hasSupabaseUrl = !!process.env.SUPABASE_URL;
const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasOpenAI = !!process.env.OPENAI_API_KEY;

console.log(`   SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);
console.log(`   OPENAI_API_KEY: ${hasOpenAI ? '✅' : '❌'}`);

if (!hasSupabaseUrl || !hasSupabaseKey || !hasOpenAI) {
  console.log('\n❌ Missing environment variables! Check your .env file');
  process.exit(1);
}

// Test 2: Supabase connection
console.log('\n2️⃣ Testing Supabase connection...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

try {
  const { count: topicCount } = await supabase
    .from('curriculum_topics')
    .select('*', { count: 'exact', head: true });
  console.log(`   ✅ Connected! Found ${topicCount} topics`);
  
  const { count: metadataCount } = await supabase
    .from('topic_ai_metadata')
    .select('*', { count: 'exact', head: true });
  console.log(`   ✅ Found ${metadataCount} topics with metadata`);
} catch (error) {
  console.log(`   ❌ Supabase error: ${error.message}`);
  process.exit(1);
}

// Test 3: OpenAI connection
console.log('\n3️⃣ Testing OpenAI API...');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

try {
  // Test embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'test',
  });
  console.log(`   ✅ Embeddings API working`);
  
  // Test chat completion
  const chatResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Say "test"' }],
    max_tokens: 10,
  });
  console.log(`   ✅ Chat API working`);
} catch (error) {
  console.log(`   ❌ OpenAI error: ${error.message}`);
  process.exit(1);
}

// Test 4: Check views and tables
console.log('\n4️⃣ Checking database structure...');
try {
  // Check if topics_with_context exists
  const { data: viewTest, error: viewError } = await supabase
    .from('topics_with_context')
    .select('*')
    .limit(1);
  
  if (viewError) {
    console.log(`   ⚠️ topics_with_context view doesn't exist`);
    console.log(`      This might be why incremental updates fail`);
  } else {
    console.log(`   ✅ topics_with_context view exists`);
  }
} catch (error) {
  console.log(`   ⚠️ Error checking view: ${error.message}`);
}

console.log('\n✅ All tests complete!\n');


