import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import pLimit from 'p-limit';
import cliProgress from 'cli-progress';

dotenv.config();

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// CRITICAL: Test what columns actually exist
async function checkTableSchema() {
  console.log('🔍 Checking topic_ai_metadata table schema...');
  
  const { data: columns, error } = await supabase
    .from('topic_ai_metadata')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error checking table:', error);
    return null;
  }
  
  if (columns && columns.length > 0) {
    console.log('✅ Table columns found:', Object.keys(columns[0]));
    return Object.keys(columns[0]);
  } else {
    // Table is empty, check schema differently
    const { data: schemaData } = await supabase
      .rpc('get_table_columns', { table_name: 'topic_ai_metadata' })
      .single();
    
    if (schemaData) {
      console.log('✅ Table schema:', schemaData);
      return schemaData;
    }
  }
  
  // Fallback: we know these columns should exist
  console.log('⚠️ Using known column list');
  return [
    'topic_id', 'embedding', 'plain_english_summary', 
    'difficulty_band', 'exam_importance', 'subject_name',
    'exam_board', 'qualification_level', 'topic_level', 
    'full_path', 'is_active', 'spec_version', 
    'generated_at', 'last_updated'
  ];
}

async function getAllTopics() {
  console.log('📥 Fetching all topics...');
  const allTopics = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('curriculum_topics')
      .select(`
        id,
        topic_name,
        topic_code,
        topic_level,
        exam_board_subjects!inner (
          subject_name,
          exam_boards!inner (code),
          qualification_types!inner (code)
        )
      `)
      .range(from, from + pageSize - 1)
      .order('id');
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    const transformed = data.map(topic => ({
      topic_id: topic.id,
      topic_name: topic.topic_name,
      topic_code: topic.topic_code,
      topic_level: topic.topic_level,
      subject_name: topic.exam_board_subjects.subject_name,
      exam_board: topic.exam_board_subjects.exam_boards.code,
      qualification_level: topic.exam_board_subjects.qualification_types.code,
      full_path: [topic.topic_name],
    }));
    
    allTopics.push(...transformed);
    from += pageSize;
    
    if (from % 10000 === 0) {
      console.log(`  Fetched ${from} topics...`);
    }
  }
  
  console.log(`  ✅ Total: ${allTopics.length} topics\n`);
  return allTopics;
}

async function getExistingMetadataIds() {
  console.log('🔍 Checking existing metadata...');
  const existingIds = new Set();
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('topic_ai_metadata')
      .select('topic_id')
      .range(from, from + pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    data.forEach(d => existingIds.add(d.topic_id));
    from += pageSize;
  }
  
  console.log(`  ✅ Found ${existingIds.size} topics with metadata\n`);
  return existingIds;
}

async function generateEmbeddings(topics, progressBar) {
  const embeddings = [];
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, Math.min(i + BATCH_SIZE, topics.length));
    const texts = batch.map(t => 
      `${t.topic_name} - ${t.subject_name} ${t.exam_board} ${t.qualification_level}`
    );
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      
      batch.forEach((topic, idx) => {
        embeddings.push({
          ...topic,
          embedding: response.data[idx].embedding,
        });
      });
      
      if (progressBar) progressBar.update(embeddings.length);
    } catch (error) {
      console.error(`\n⚠️ Embedding error:`, error.message);
      // Add placeholder
      batch.forEach(topic => {
        embeddings.push({
          ...topic,
          embedding: new Array(1536).fill(0),
        });
      });
    }
  }
  
  return embeddings;
}

async function generateSummary(topic) {
  const prompt = `Topic: ${topic.topic_name}
Subject: ${topic.subject_name}
Level: ${topic.qualification_level} (${topic.exam_board})

Generate:
1. Plain English summary (1-2 sentences)
2. Difficulty: Foundation, Intermediate, or Advanced (for ${topic.qualification_level})
3. Exam importance: 0.0 to 1.0

Format as JSON: {"summary": "...", "difficulty_band": "...", "exam_importance": 0.0}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant. Be concise and accurate.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || 'No summary available',
      difficulty_band: parsed.difficulty_band || 'Intermediate',
      exam_importance: parsed.exam_importance || 0.5,
    };
  } catch (error) {
    return {
      summary: `Study of ${topic.topic_name} in ${topic.subject_name}`,
      difficulty_band: 'Intermediate',
      exam_importance: 0.5,
    };
  }
}

async function generateSummaries(topics, progressBar) {
  const limit = pLimit(5);
  const promises = topics.map(topic =>
    limit(async () => {
      const result = await generateSummary(topic);
      if (progressBar) progressBar.increment();
      return { topic_id: topic.topic_id, ...result };
    })
  );
  
  return Promise.all(promises);
}

async function saveMetadata(metadata) {
  console.log(`\n💾 Saving ${metadata.length} topics to database...`);
  
  const BATCH_SIZE = 50; // Small batches to avoid timeouts
  let savedCount = 0;
  
  for (let i = 0; i < metadata.length; i += BATCH_SIZE) {
    const batch = metadata.slice(i, Math.min(i + BATCH_SIZE, metadata.length));
    
    // Build save objects with EXACT columns from database
    const saveData = batch.map(m => ({
      topic_id: m.topic_id,
      embedding: JSON.stringify(m.embedding),
      plain_english_summary: m.summary,
      difficulty_band: m.difficulty_band,
      exam_importance: m.exam_importance,
      subject_name: m.subject_name,
      exam_board: m.exam_board,
      qualification_level: m.qualification_level,
      topic_level: m.topic_level,
      full_path: m.full_path,
      is_active: true,
      spec_version: '2024',
      generated_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
      // NO topic_name - it doesn't exist in the table!
    }));
    
    // Try to save
    const { data, error } = await supabase
      .from('topic_ai_metadata')
      .upsert(saveData, { 
        onConflict: 'topic_id',
        ignoreDuplicates: false 
      })
      .select();
    
    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i/BATCH_SIZE) + 1} failed:`, error.message);
      // Try individual saves
      for (const item of saveData) {
        const { error: singleError } = await supabase
          .from('topic_ai_metadata')
          .upsert(item, { onConflict: 'topic_id' });
        
        if (!singleError) {
          savedCount++;
        } else {
          console.error(`  Failed single save:`, singleError.message);
        }
      }
    } else {
      savedCount += batch.length;
      process.stdout.write(`  Saved ${savedCount}/${metadata.length}\r`);
    }
  }
  
  console.log(`\n  ✅ Successfully saved ${savedCount}/${metadata.length} topics`);
  return savedCount;
}

async function verifyCount() {
  const { count } = await supabase
    .from('topic_ai_metadata')
    .select('*', { count: 'exact', head: true });
  
  return count || 0;
}

async function main() {
  console.log('🚀 FINAL WORKING TOPIC METADATA GENERATION\n');
  console.log('════════════════════════════════════════════\n');
  
  try {
    // Check schema first
    const columns = await checkTableSchema();
    if (!columns) {
      console.error('❌ Cannot determine table schema');
      return;
    }
    
    // Get all topics
    const allTopics = await getAllTopics();
    
    // Filter to unprocessed
    const existingIds = await getExistingMetadataIds();
    const topicsToProcess = allTopics.filter(t => !existingIds.has(t.topic_id));
    
    console.log('📊 Status:');
    console.log(`   Total topics: ${allTopics.length}`);
    console.log(`   Already done: ${existingIds.size}`);
    console.log(`   To process: ${topicsToProcess.length}\n`);
    
    if (topicsToProcess.length === 0) {
      console.log('✅ All topics have metadata!');
      return;
    }
    
    // Confirm
    const cost = topicsToProcess.length * 0.00004;
    console.log(`💰 Cost: ~$${cost.toFixed(2)}`);
    console.log(`⏱️ Time: ~${Math.ceil(topicsToProcess.length / 250)} minutes`);
    console.log('\n⚠️ Starting in 5 seconds... Press Ctrl+C to cancel\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Process in windows
    const WINDOW_SIZE = 2000;
    const totalWindows = Math.ceil(topicsToProcess.length / WINDOW_SIZE);
    
    for (let w = 0; w < totalWindows; w++) {
      const start = w * WINDOW_SIZE;
      const end = Math.min(start + WINDOW_SIZE, topicsToProcess.length);
      const window = topicsToProcess.slice(start, end);
      
      console.log('════════════════════════════════════════════');
      console.log(`📦 Window ${w + 1}/${totalWindows}: ${window.length} topics`);
      
      // Progress bars
      const multiBar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: '{bar} {percentage}% | {value}/{total} | {task}',
      }, cliProgress.Presets.shades_classic);
      
      const embBar = multiBar.create(window.length, 0, { task: 'Embeddings' });
      const sumBar = multiBar.create(window.length, 0, { task: 'Summaries' });
      
      // Generate
      console.log('\n🧠 Generating embeddings...');
      const embeddings = await generateEmbeddings(window, embBar);
      embBar.update(window.length);
      
      console.log('📝 Generating summaries...');
      const summaries = await generateSummaries(window, sumBar);
      sumBar.update(window.length);
      
      multiBar.stop();
      
      // Merge
      const metadata = embeddings.map(emb => {
        const sum = summaries.find(s => s.topic_id === emb.topic_id);
        return { ...emb, ...sum };
      });
      
      // Save
      const saved = await saveMetadata(metadata);
      
      // Verify
      const actualCount = await verifyCount();
      console.log(`\n📊 Database now has: ${actualCount} topics with metadata`);
      console.log(`✅ Window ${w + 1} complete!\n`);
    }
    
    // Final stats
    const finalCount = await verifyCount();
    console.log('════════════════════════════════════════════');
    console.log(`🎉 COMPLETE! ${finalCount}/${allTopics.length} topics have metadata`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('Stack:', error.stack);
  }
}

// Run
main();
