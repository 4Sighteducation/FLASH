import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSave() {
  console.log('🧪 Testing save to topic_ai_metadata...\n');
  
  // First, get a topic that doesn't have metadata
  const { data: topics, error: fetchError } = await supabase
    .from('curriculum_topics')
    .select('id, topic_name')
    .limit(1);
  
  if (fetchError) {
    console.error('Error fetching topic:', fetchError);
    return;
  }
  
  if (!topics || topics.length === 0) {
    console.error('No topics found');
    return;
  }
  
  const testTopic = topics[0];
  console.log(`Test topic: ${testTopic.topic_name} (${testTopic.id})`);
  
  // Try to save test metadata
  const testData = {
    topic_id: testTopic.id,
    embedding: JSON.stringify(new Array(1536).fill(0)),
    plain_english_summary: 'Test summary',
    difficulty_band: 'Foundation',
    exam_importance: 0.5,
    subject_name: 'Test Subject',
    exam_board: 'TEST',
    qualification_level: 'TEST',
    topic_name: testTopic.topic_name,
    topic_level: 1,
    full_path: ['Test', 'Path']
  };
  
  console.log('\nAttempting to save with these fields:');
  console.log(Object.keys(testData).join(', '));
  
  const { data: saved, error: saveError } = await supabase
    .from('topic_ai_metadata')
    .upsert(testData, { onConflict: 'topic_id' })
    .select();
  
  if (saveError) {
    console.error('\n❌ Save failed:', saveError);
    console.error('Error details:', JSON.stringify(saveError, null, 2));
    
    // Try to get table schema
    console.log('\n📋 Checking actual table columns...');
    const { data: columns, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'topic_ai_metadata');
    
    if (columns) {
      console.log('Actual columns in topic_ai_metadata:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : ''}`);
      });
    }
  } else {
    console.log('\n✅ Save successful!');
    console.log('Saved data:', saved);
    
    // Clean up test data
    await supabase
      .from('topic_ai_metadata')
      .delete()
      .eq('topic_id', testTopic.id)
      .eq('exam_board', 'TEST');
    console.log('Test data cleaned up');
  }
}

testSave().catch(console.error);


