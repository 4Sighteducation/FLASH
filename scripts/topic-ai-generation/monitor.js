import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitor() {
  console.clear();
  console.log('📊 LIVE MONITORING - Updates every 10 seconds');
  console.log('Press Ctrl+C to stop monitoring\n');
  console.log('════════════════════════════════════════════\n');
  
  let lastCount = 0;
  let startTime = Date.now();
  let lastCheckTime = Date.now();
  
  while (true) {
    // Get current count
    const { count: currentCount } = await supabase
      .from('topic_ai_metadata')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalTopics } = await supabase
      .from('curriculum_topics')
      .select('*', { count: 'exact', head: true });
    
    // Calculate progress
    const processed = currentCount || 0;
    const percentage = ((processed / totalTopics) * 100).toFixed(1);
    const windowsComplete = Math.floor(processed / 2000);
    const currentWindow = windowsComplete + 1;
    const topicsInCurrentWindow = processed % 2000;
    
    // Calculate rate
    const timeSinceLastCheck = (Date.now() - lastCheckTime) / 1000; // seconds
    const topicsProcessedSinceLastCheck = processed - lastCount;
    const topicsPerSecond = topicsProcessedSinceLastCheck / timeSinceLastCheck;
    const topicsPerMinute = Math.round(topicsPerSecond * 60);
    
    // Estimate time remaining
    const topicsRemaining = totalTopics - processed;
    const minutesRemaining = topicsPerMinute > 0 ? Math.ceil(topicsRemaining / topicsPerMinute) : '???';
    const hoursRemaining = minutesRemaining !== '???' ? (minutesRemaining / 60).toFixed(1) : '???';
    
    // Clear and update display
    console.clear();
    console.log('📊 LIVE MONITORING - Updates every 10 seconds');
    console.log('Press Ctrl+C to stop monitoring\n');
    console.log('════════════════════════════════════════════\n');
    
    console.log(`✅ Topics with AI metadata: ${processed.toLocaleString()} / ${totalTopics.toLocaleString()} (${percentage}%)`);
    console.log(`📦 Window Progress: Window ${currentWindow}/28`);
    if (topicsInCurrentWindow > 0 && topicsInCurrentWindow < 2000) {
      const windowPercentage = ((topicsInCurrentWindow / 2000) * 100).toFixed(0);
      console.log(`   Current window: ${topicsInCurrentWindow}/2000 topics (${windowPercentage}%)`);
    }
    
    console.log(`\n⚡ Processing Speed:`);
    if (topicsPerMinute > 0) {
      console.log(`   ${topicsPerMinute} topics/minute`);
    }
    
    // Status indicator
    if (processed > lastCount) {
      console.log(`\n🟢 ACTIVELY PROCESSING`);
      console.log(`   +${processed - lastCount} topics in last 10 seconds`);
    } else if (processed === lastCount) {
      console.log(`\n🟡 NO CHANGE DETECTED`);
      console.log(`   Might be generating summaries (slow) or stuck`);
      console.log(`   If stuck for >5 minutes, restart the script`);
    }
    
    console.log(`\n⏱️  Time Remaining: ~${hoursRemaining} hours (${minutesRemaining} minutes)`);
    
    // Progress bar
    const barLength = 40;
    const filledLength = Math.round((processed / totalTopics) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`\n[${bar}] ${percentage}%`);
    
    // Update for next iteration
    lastCount = processed;
    lastCheckTime = Date.now();
    
    // Check if complete
    if (processed >= totalTopics) {
      console.log('\n\n🎉 GENERATION COMPLETE!');
      break;
    }
    
    // Wait 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

monitor().catch(console.error);


