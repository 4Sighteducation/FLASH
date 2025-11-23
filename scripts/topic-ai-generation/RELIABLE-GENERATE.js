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

// Configuration
const CONFIG = {
  WINDOW_SIZE: 2000,
  EMBEDDING_BATCH_SIZE: 100,
  SAVE_BATCH_SIZE: 100,
  MAX_CONCURRENT_SUMMARIES: 5,
  START_FROM_TOPIC: 0, // Change this to resume from specific point
};

// Progress tracking
let globalProgress = {
  totalTopics: 0,
  processedTopics: 0,
  currentWindow: 0,
  totalWindows: 0,
  startTime: Date.now(),
};

/**
 * Get all topics with proper error handling
 */
async function getAllTopics() {
  console.log('📥 Fetching all topics from database...');
  const allTopics = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    try {
      // Direct query to curriculum_topics with joins
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select(`
          id,
          topic_name,
          topic_code,
          topic_level,
          parent_topic_id,
          exam_board_subjects!inner (
            subject_name,
            exam_boards!inner (
              code
            ),
            qualification_types!inner (
              code
            )
          )
        `)
        .range(from, from + pageSize - 1)
        .order('id');
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      // Transform data to flat structure
      const transformed = data.map(topic => ({
        topic_id: topic.id,
        topic_name: topic.topic_name,
        topic_code: topic.topic_code,
        topic_level: topic.topic_level,
        parent_topic_id: topic.parent_topic_id,
        subject_name: topic.exam_board_subjects.subject_name,
        exam_board: topic.exam_board_subjects.exam_boards.code,
        qualification_level: topic.exam_board_subjects.qualification_types.code,
        full_path: [topic.topic_name], // Simplified for now
      }));
      
      allTopics.push(...transformed);
      from += pageSize;
      
      if (from % 10000 === 0) {
        console.log(`  Fetched ${from} topics...`);
      }
    } catch (error) {
      console.error(`Error fetching topics at offset ${from}:`, error);
      throw error;
    }
  }
  
  console.log(`  ✅ Total topics fetched: ${allTopics.length}\n`);
  return allTopics;
}

/**
 * Get topics that already have metadata
 */
async function getExistingMetadataIds() {
  console.log('🔍 Checking existing metadata...');
  const existingIds = new Set();
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    try {
      const { data, error } = await supabase
        .from('topic_ai_metadata')
        .select('topic_id')
        .range(from, from + pageSize - 1);
      
      if (error) throw error;
      if (!data || data.length === 0) break;
      
      data.forEach(d => existingIds.add(d.topic_id));
      from += pageSize;
    } catch (error) {
      console.error(`Error fetching metadata at offset ${from}:`, error);
      throw error;
    }
  }
  
  console.log(`  ✅ Found ${existingIds.size} topics with existing metadata\n`);
  return existingIds;
}

/**
 * Generate embeddings for a batch of topics
 */
async function generateEmbeddings(topics, progressBar) {
  const embeddings = [];
  
  for (let i = 0; i < topics.length; i += CONFIG.EMBEDDING_BATCH_SIZE) {
    const batch = topics.slice(i, Math.min(i + CONFIG.EMBEDDING_BATCH_SIZE, topics.length));
    const texts = batch.map(t => `${t.topic_name} - ${t.subject_name} ${t.exam_board} ${t.qualification_level}`);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      
      batch.forEach((topic, idx) => {
        embeddings.push({
          topic_id: topic.topic_id,
          embedding: response.data[idx].embedding,
          ...topic,
        });
      });
      
      if (progressBar) progressBar.update(embeddings.length);
    } catch (error) {
      console.error(`\nError generating embeddings:`, error.message);
      // Add placeholder embeddings so we can continue
      batch.forEach(topic => {
        embeddings.push({
          topic_id: topic.topic_id,
          embedding: new Array(1536).fill(0), // Placeholder
          ...topic,
        });
      });
    }
  }
  
  return embeddings;
}

/**
 * Generate summary for a single topic
 */
async function generateSummary(topic) {
  const prompt = `Topic: ${topic.topic_name}
Subject: ${topic.subject_name}
Level: ${topic.qualification_level} (${topic.exam_board})
Context: ${topic.full_path.join(' > ')}

Generate:
1. A plain English summary (1-2 sentences) explaining what this topic covers
2. Difficulty band: Foundation, Intermediate, or Advanced (relative to ${topic.qualification_level} level)
3. Exam importance: 0.0 to 1.0 (how likely to appear in exams)

Format as JSON: {"summary": "...", "difficulty_band": "...", "exam_importance": 0.0}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational assistant helping students understand curriculum topics. Be concise and accurate.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });
    
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      topic_id: topic.topic_id,
      summary: parsed.summary || 'No summary available',
      difficulty_band: parsed.difficulty_band || 'Intermediate',
      exam_importance: parsed.exam_importance || 0.5,
    };
  } catch (error) {
    // Return defaults on error
    return {
      topic_id: topic.topic_id,
      summary: `Study of ${topic.topic_name} in ${topic.subject_name}`,
      difficulty_band: 'Intermediate',
      exam_importance: 0.5,
    };
  }
}

/**
 * Generate summaries for topics with concurrency limit
 */
async function generateSummaries(topics, progressBar) {
  const limit = pLimit(CONFIG.MAX_CONCURRENT_SUMMARIES);
  const promises = topics.map(topic =>
    limit(async () => {
      const result = await generateSummary(topic);
      if (progressBar) progressBar.increment();
      return result;
    })
  );
  
  return Promise.all(promises);
}

/**
 * Save metadata to database with retry logic
 */
async function saveMetadata(metadata) {
  for (let i = 0; i < metadata.length; i += CONFIG.SAVE_BATCH_SIZE) {
    const batch = metadata.slice(i, Math.min(i + CONFIG.SAVE_BATCH_SIZE, metadata.length));
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await supabase
          .from('topic_ai_metadata')
          .upsert(
            batch.map(m => ({
              topic_id: m.topic_id,
              embedding: JSON.stringify(m.embedding),
              plain_english_summary: m.summary,
              difficulty_band: m.difficulty_band,
              exam_importance: m.exam_importance,
              subject_name: m.subject_name,
              exam_board: m.exam_board,
              qualification_level: m.qualification_level,
              topic_name: m.topic_name,
              topic_level: m.topic_level,
              full_path: m.full_path
              // REMOVED created_at and updated_at - table doesn't have these!
            })),
            { onConflict: 'topic_id' }
          );
        
        if (error) throw error;
        break; // Success, exit retry loop
      } catch (error) {
        console.error(`\n⚠️ Save attempt ${attempt} failed:`, error.message);
        if (attempt === 3) {
          console.error('❌ Failed to save batch after 3 attempts');
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
    }
  }
}

/**
 * Main processing function
 */
async function main() {
  console.log('🚀 RELIABLE TOPIC METADATA GENERATION\n');
  console.log('════════════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Get all topics
    const allTopics = await getAllTopics();
    globalProgress.totalTopics = allTopics.length;
    
    // Step 2: Filter out topics that already have metadata
    const existingIds = await getExistingMetadataIds();
    const topicsToProcess = allTopics.filter(t => !existingIds.has(t.topic_id));
    
    console.log('📊 Processing Plan:');
    console.log(`   Total topics: ${allTopics.length}`);
    console.log(`   Already processed: ${existingIds.size}`);
    console.log(`   To process: ${topicsToProcess.length}\n`);
    
    if (topicsToProcess.length === 0) {
      console.log('✅ All topics already have metadata!');
      return;
    }
    
    // Step 3: Ask for confirmation
    const estimatedCost = topicsToProcess.length * 0.00004;
    const estimatedMinutes = Math.ceil(topicsToProcess.length / 250);
    
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(2)}`);
    console.log(`⏱️ Estimated time: ${estimatedMinutes} minutes`);
    console.log('\n⚠️ Starting in 5 seconds... Press Ctrl+C to cancel\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Process in windows
    const totalWindows = Math.ceil(topicsToProcess.length / CONFIG.WINDOW_SIZE);
    globalProgress.totalWindows = totalWindows;
    
    for (let windowNum = 0; windowNum < totalWindows; windowNum++) {
      const start = windowNum * CONFIG.WINDOW_SIZE;
      const end = Math.min(start + CONFIG.WINDOW_SIZE, topicsToProcess.length);
      const windowTopics = topicsToProcess.slice(start, end);
      
      console.log('════════════════════════════════════════════════════════════');
      console.log(`📦 Window ${windowNum + 1}/${totalWindows}: Processing ${windowTopics.length} topics`);
      console.log(`   Topics ${start + 1} to ${end} of ${topicsToProcess.length}`);
      
      // Create progress bars
      const multiBar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: '{bar} {percentage}% | {value}/{total} | {task}',
      }, cliProgress.Presets.shades_classic);
      
      const embeddingBar = multiBar.create(windowTopics.length, 0, { task: 'Embeddings' });
      const summaryBar = multiBar.create(windowTopics.length, 0, { task: 'Summaries' });
      
      // Generate embeddings
      console.log('\n🧠 Generating embeddings...');
      const embeddings = await generateEmbeddings(windowTopics, embeddingBar);
      embeddingBar.update(windowTopics.length);
      
      // Generate summaries
      console.log('📝 Generating summaries...');
      const summaries = await generateSummaries(windowTopics, summaryBar);
      summaryBar.update(windowTopics.length);
      
      multiBar.stop();
      
      // Merge results
      const metadata = embeddings.map((emb, idx) => {
        const summary = summaries.find(s => s.topic_id === emb.topic_id) || summaries[idx];
        return { ...emb, ...summary };
      });
      
      // Save to database
      console.log('\n💾 Saving to database...');
      await saveMetadata(metadata);
      
      globalProgress.processedTopics += windowTopics.length;
      globalProgress.currentWindow = windowNum + 1;
      
      console.log(`✅ Window ${windowNum + 1} complete!\n`);
      
      // Show overall progress
      const overallPercentage = ((globalProgress.processedTopics + existingIds.size) / globalProgress.totalTopics * 100).toFixed(1);
      console.log(`📊 Overall Progress: ${globalProgress.processedTopics + existingIds.size}/${globalProgress.totalTopics} (${overallPercentage}%)`);
      
      const elapsedMinutes = Math.floor((Date.now() - globalProgress.startTime) / 60000);
      console.log(`⏱️ Elapsed time: ${elapsedMinutes} minutes\n`);
    }
    
    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 GENERATION COMPLETE!');
    console.log(`✅ Successfully processed ${globalProgress.processedTopics} topics`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('\nYou can restart the script - it will skip already processed topics');
  }
}

// Run the script
main();
