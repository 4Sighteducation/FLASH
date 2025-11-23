import cliProgress from 'cli-progress';
import { 
  fetchTopicsNeedingMetadata,
  upsertTopicMetadata,
  getMetadataStats,
  supabase
} from './lib/supabase-client.js';
import { generateAllEmbeddings } from './lib/embedding-generator.js';
import { generateAllSummaries } from './lib/summary-generator.js';
import { config } from './config.js';

async function main() {
  console.log('🚀 CONTINUING FROM TOPIC 4001\n');
  console.log('════════════════════════════════════════════════════════════\n');
  
  // FORCE CHECK: Get topics that ACTUALLY have metadata
  console.log('📊 Checking actual database status...');
  const { count: hasMetadata } = await supabase
    .from('topic_ai_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  ✅ Topics with metadata: ${hasMetadata}`);
  
  // Get all topics
  console.log('📥 Fetching all topics...');
  const allTopics = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('topics_with_context')
      .select('*')
      .range(from, from + pageSize - 1)
      .order('topic_id');
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allTopics.push(...data);
    from += pageSize;
    
    if (from % 5000 === 0) {
      console.log(`  Fetched ${from} topics...`);
    }
  }
  
  console.log(`  Total topics: ${allTopics.length}`);
  
  // MANUALLY SKIP THE FIRST 4000
  const SKIP_FIRST = 4000; // We know the first 4000 are done
  console.log(`\n⏭️ SKIPPING FIRST ${SKIP_FIRST} TOPICS (already processed)\n`);
  
  const topicsToProcess = allTopics.slice(SKIP_FIRST);
  
  console.log(`📝 Will process ${topicsToProcess.length} topics`);
  
  // Show breakdown
  const byBoard = {};
  topicsToProcess.forEach(t => {
    const key = `${t.exam_board} ${t.qualification_level}`;
    byBoard[key] = (byBoard[key] || 0) + 1;
  });
  
  Object.entries(byBoard).forEach(([key, count]) => {
    console.log(`   ${key}: ${count} topics`);
  });
  
  // Cost estimate
  const embeddingCost = topicsToProcess.length * 0.00001;
  const summaryCost = topicsToProcess.length * 0.00003;
  const totalCost = embeddingCost + summaryCost;
  
  console.log(`💰 Estimated cost: $${totalCost.toFixed(4)}`);
  console.log(`   Embeddings: $${embeddingCost.toFixed(4)}`);
  console.log(`   Summaries: $${summaryCost.toFixed(4)}`);
  
  // Time estimate
  const estimatedMinutes = Math.ceil((topicsToProcess.length / 250) * 1.2);
  console.log(`⏱️ Estimated time: ~${estimatedMinutes} minutes`);
  
  // Countdown
  console.log('\n⚠️ Starting in 5 seconds... Press Ctrl+C to cancel\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('════════════════════════════════════════════════════════════');
  console.log('Starting generation...\n');
  
  // Process in windows
  const WINDOW_SIZE = 2000;
  const totalWindows = Math.ceil(topicsToProcess.length / WINDOW_SIZE);
  
  for (let windowNum = 0; windowNum < totalWindows; windowNum++) {
    const start = windowNum * WINDOW_SIZE;
    const end = Math.min(start + WINDOW_SIZE, topicsToProcess.length);
    const window = topicsToProcess.slice(start, end);
    
    // Adjust window number for display (continue from Window 3)
    const displayWindowNum = windowNum + 3; // Since we're starting from topic 4001 (Window 3)
    
    console.log(`📦 Window ${displayWindowNum}/28: Topics ${SKIP_FIRST + start + 1}-${SKIP_FIRST + end}`);
    console.log('────────────────────────────────────────────────────────────');
    
    // Generate embeddings
    console.log('🧠 Generating embeddings (batches of 100)...');
    const embeddings = await generateAllEmbeddings(window);
    
    // Generate summaries  
    console.log('📝 Generating AI summaries (max 5 concurrent)...');
    const summaries = await generateAllSummaries(window);
    
    // Merge and save
    console.log(`💾 Saving window ${displayWindowNum} to database...`);
    
    const metadata = embeddings.map((emb, idx) => {
      const summary = summaries[idx];
      return {
        topic_id: emb.topic_id,
        embedding: JSON.stringify(emb.embedding),
        plain_english_summary: summary.summary,
        difficulty_band: summary.difficulty_band,
        exam_importance: summary.exam_importance,
        subject_name: emb.subject_name,
        exam_board: emb.exam_board,
        qualification_level: emb.qualification_level,
        topic_name: emb.topic_name,
        topic_level: emb.topic_level,
        full_path: emb.full_path,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    // Save in batches
    const upsertBatchSize = 500;
    for (let i = 0; i < metadata.length; i += upsertBatchSize) {
      const batch = metadata.slice(i, i + upsertBatchSize);
      await upsertTopicMetadata(batch);
    }
    
    console.log(`✅ Window ${displayWindowNum} complete (${window.length} topics saved)\n`);
  }
  
  // Final stats
  const stats = await getMetadataStats();
  console.log('════════════════════════════════════════════════════════════');
  console.log('✅ GENERATION COMPLETE!');
  console.log(`📊 Final coverage: ${stats.withMetadata}/${stats.totalTopics} (${stats.coveragePercent}%)`);
}

main().catch(console.error);


