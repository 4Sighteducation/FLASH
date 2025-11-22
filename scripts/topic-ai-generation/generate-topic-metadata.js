import cliProgress from 'cli-progress';
import { 
  fetchTopicsNeedingMetadata,
  upsertTopicMetadata,
  getMetadataStats 
} from './lib/supabase-client.js';
import { generateAllEmbeddings } from './lib/embedding-generator.js';
import { generateAllSummaries } from './lib/summary-generator.js';
import { config } from './config.js';

// Progress bars
const multibar = new cliProgress.MultiBar({
  clearOnComplete: false,
  hideCursor: true,
  format: '{task} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | {duration}s'
}, cliProgress.Presets.shades_classic);

async function main() {
  console.log('🚀 FLASH Topic Metadata Generation\n');
  console.log('═'.repeat(60));
  
  // Check configuration
  if (!config.supabase.url || !config.openai.apiKey) {
    console.error('❌ Missing configuration! Check your .env file.');
    console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
    process.exit(1);
  }
  
  // Dry run mode - just show what would be processed
  if (config.dryRun) {
    console.log('\n🧪 DRY RUN MODE - No changes will be made\n');
    const stats = await getMetadataStats();
    console.log('Current coverage:');
    console.log(`  Total topics: ${stats.totalTopics}`);
    console.log(`  With metadata: ${stats.withMetadata} (${stats.coveragePercent}%)`);
    console.log(`  Needs processing: ${stats.needingMetadata}`);
    console.log('\nRun without --dry-run to process topics.');
    return;
  }
  
  // Step 1: Fetch topics needing metadata
  console.log('\n📊 Checking database status...\n');
  
  const filters = config.pilot.enabled ? {
    examBoard: config.pilot.board,
    subject: config.pilot.subject
  } : {};
  
  let topicsToProcess = await fetchTopicsNeedingMetadata(filters);
  
  // Pilot mode - limit to first N topics
  if (config.pilot.enabled) {
    topicsToProcess = topicsToProcess.slice(0, config.pilot.topicLimit);
    console.log(`🧪 PILOT MODE: Processing ${topicsToProcess.length} topics`);
    console.log(`   Board: ${config.pilot.board}`);
    console.log(`   Subject: ${config.pilot.subject}\n`);
  }
  
  if (topicsToProcess.length === 0) {
    console.log('✅ All topics already have metadata. Nothing to do!');
    const stats = await getMetadataStats();
    console.log(`\n📊 Coverage: ${stats.withMetadata}/${stats.totalTopics} (${stats.coveragePercent}%)`);
    return;
  }
  
  // Show what will be processed
  console.log(`📝 Will process ${topicsToProcess.length} topics:`);
  const boardCounts = {};
  topicsToProcess.forEach(t => {
    const key = `${t.exam_board} ${t.qualification_level}`;
    boardCounts[key] = (boardCounts[key] || 0) + 1;
  });
  Object.entries(boardCounts).forEach(([key, count]) => {
    console.log(`   ${key}: ${count} topics`);
  });
  
  // Cost estimate
  const embeddingTokens = topicsToProcess.length * 50;
  const summaryTokens = topicsToProcess.length * 200;
  const embeddingCost = (embeddingTokens / 1_000_000) * 0.02;
  const summaryCost = (summaryTokens / 1_000_000) * 0.15;
  const totalCost = embeddingCost + summaryCost;
  
  console.log(`\n💰 Estimated cost: $${totalCost.toFixed(4)}`);
  console.log(`   Embeddings: $${embeddingCost.toFixed(4)}`);
  console.log(`   Summaries: $${summaryCost.toFixed(4)}`);
  
  // Confirmation for large batches
  if (topicsToProcess.length > 1000 && !config.pilot.enabled) {
    console.log(`\n⚠️  Processing ${topicsToProcess.length} topics`);
    console.log(`   Estimated time: ~${Math.ceil(topicsToProcess.length / 500)} minutes`);
    console.log('\n   Press Ctrl+C to cancel, or waiting 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('Starting generation...\n');
  
  // Process in windows to avoid memory issues
  const WINDOW_SIZE = config.batch.windowSize;
  const totalWindows = Math.ceil(topicsToProcess.length / WINDOW_SIZE);
  
  for (let windowNum = 0; windowNum < totalWindows; windowNum++) {
    const windowStart = windowNum * WINDOW_SIZE;
    const windowEnd = Math.min(windowStart + WINDOW_SIZE, topicsToProcess.length);
    const window = topicsToProcess.slice(windowStart, windowEnd);
    
    console.log(`\n📦 Window ${windowNum + 1}/${totalWindows}: Topics ${windowStart + 1}-${windowEnd}`);
    console.log('─'.repeat(60));
    
    // Step 2: Generate embeddings for this window
    const embeddingBar = multibar.create(window.length, 0, { 
      task: `Embeddings ${windowNum + 1}/${totalWindows}`
    });
    
    const embeddings = await generateAllEmbeddings(
      window,
      (current) => embeddingBar.update(current)
    );
    
    embeddingBar.stop();
    
    // Step 3: Generate AI summaries for this window
    const summaryBar = multibar.create(window.length, 0, { 
      task: `Summaries  ${windowNum + 1}/${totalWindows}`
    });
    
    const summaries = await generateAllSummaries(
      window,
      (current) => summaryBar.update(current)
    );
    
    summaryBar.stop();
    
    // Step 4: Merge and save this window
    console.log(`💾 Saving window ${windowNum + 1} to database...`);
    
    const metadata = embeddings.map((emb, idx) => {
      const summary = summaries[idx];
      return {
        topic_id: emb.topic_id,
        embedding: JSON.stringify(emb.embedding), // Supabase expects JSON string for vector
        plain_english_summary: summary.summary,
        difficulty_band: summary.difficulty_band,
        exam_importance: summary.exam_importance,
        subject_name: emb.subject_name,
        exam_board: emb.exam_board,
        qualification_level: emb.qualification_level,
        topic_level: emb.topic_level,
        full_path: emb.full_path,
        is_active: true,
        spec_version: 'v1',
      };
    });
    
    // Upsert in smaller batches (Supabase limit)
    const upsertBatchSize = config.batch.upsertBatchSize;
    for (let i = 0; i < metadata.length; i += upsertBatchSize) {
      const batch = metadata.slice(i, i + upsertBatchSize);
      await upsertTopicMetadata(batch);
    }
    
    console.log(`✅ Window ${windowNum + 1} complete (${window.length} topics saved)\n`);
  }
  
  multibar.stop();
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 GENERATION COMPLETE!\n');
  
  // Final statistics
  const stats = await getMetadataStats();
  console.log('📊 Final Coverage:');
  console.log(`   Total topics: ${stats.totalTopics}`);
  console.log(`   With metadata: ${stats.withMetadata} (${stats.coveragePercent}%)`);
  console.log(`   Remaining: ${stats.needingMetadata}`);
  
  // Actual cost (if not pilot)
  if (!config.pilot.enabled) {
    console.log(`\n💰 Actual Cost: ~$${totalCost.toFixed(4)}`);
  }
  
  console.log('\n✅ Topics are now searchable via semantic search!');
  console.log('   Next: Test search API with /api/topics/search-topics\n');
}

// Run with error handling
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

