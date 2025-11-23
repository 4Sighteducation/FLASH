import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkStatus() {
  console.log('🔍 Checking current metadata status...\n');

  // 1. Check total topics
  const { count: totalTopics } = await supabase
    .from('curriculum_topics')
    .select('*', { count: 'exact', head: true });

  console.log(`Total topics in database: ${totalTopics}`);

  // 2. Check topics with metadata
  const { count: topicsWithMetadata } = await supabase
    .from('topic_ai_metadata')
    .select('*', { count: 'exact', head: true });

  console.log(`Topics with AI metadata: ${topicsWithMetadata}`);

  // 3. Check topics WITHOUT metadata using the view
  const { data: needingMetadata, error } = await supabase
    .from('get_topics_needing_metadata')
    .select('*')
    .limit(10);

  if (error) {
    console.log('\n❌ Error checking topics needing metadata:', error.message);
    
    // Try alternative method
    console.log('\nTrying alternative check...');
    
    // Check if topic_ai_metadata table exists
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'topic_ai_metadata');
    
    if (!tables || tables.length === 0) {
      console.log('❌ topic_ai_metadata table does not exist!');
      console.log('You need to run the SQL migration first.');
    } else {
      console.log('✅ topic_ai_metadata table exists');
      
      // Sample check
      const { data: sample } = await supabase
        .from('topic_ai_metadata')
        .select('topic_id, exam_board, subject_name, created_at')
        .limit(5);
      
      if (sample && sample.length > 0) {
        console.log('\nSample of existing metadata:');
        sample.forEach(s => {
          console.log(`  - ${s.exam_board} ${s.subject_name} (${s.created_at})`);
        });
      }
    }
  } else {
    console.log(`\nTopics needing metadata: ${needingMetadata ? needingMetadata.length : 0}`);
    if (needingMetadata && needingMetadata.length > 0) {
      console.log('First few topics without metadata:');
      needingMetadata.slice(0, 5).forEach(t => {
        console.log(`  - ${t.exam_board} ${t.subject_name}: ${t.topic_name}`);
      });
    }
  }

  console.log(`\n📊 Coverage: ${topicsWithMetadata}/${totalTopics} (${((topicsWithMetadata/totalTopics) * 100).toFixed(1)}%)`);
  
  // Check what windows completed
  const windowsCompleted = Math.floor(topicsWithMetadata / 2000);
  const topicsInProgress = topicsWithMetadata % 2000;
  console.log(`\n✅ Windows completed: ${windowsCompleted}`);
  if (topicsInProgress > 0) {
    console.log(`⚠️  Partial window: ${topicsInProgress} topics`);
  }
  console.log(`📦 Next window to process: Window ${windowsCompleted + 1}/28`);
  console.log(`📝 Topics remaining: ${totalTopics - topicsWithMetadata}`);
}

checkStatus().catch(console.error);
