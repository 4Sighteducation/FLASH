import { config } from './config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

async function checkSubjects() {
  console.log('📊 Checking what subject names exist in topic_ai_metadata...\n');
  
  // Get unique subject names
  const { data, error } = await supabase
    .from('topic_ai_metadata')
    .select('subject_name, exam_board, qualification_level')
    .limit(100);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  // Get unique combinations
  const uniqueCombos = new Map();
  
  data.forEach(item => {
    const key = `${item.exam_board}|${item.qualification_level}|${item.subject_name}`;
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, item);
    }
  });
  
  // Group by subject
  const bySubject = {};
  uniqueCombos.forEach((item) => {
    if (!bySubject[item.subject_name]) {
      bySubject[item.subject_name] = [];
    }
    bySubject[item.subject_name].push({
      board: item.exam_board,
      level: item.qualification_level
    });
  });
  
  console.log('📚 SUBJECT NAMES IN DATABASE:\n');
  Object.keys(bySubject).sort().forEach(subject => {
    console.log(`• ${subject}`);
    bySubject[subject].forEach(item => {
      console.log(`  - ${item.board} ${item.level}`);
    });
  });
  
  // Get count by subject
  console.log('\n📊 SAMPLE OF TOPICS:');
  
  const { data: sampleTopics } = await supabase
    .from('topic_ai_metadata')
    .select('subject_name, exam_board, qualification_level, plain_english_summary')
    .like('plain_english_summary', '%photo%')
    .limit(5);
  
  if (sampleTopics && sampleTopics.length > 0) {
    console.log('\nTopics containing "photo":');
    sampleTopics.forEach(t => {
      console.log(`- ${t.subject_name} (${t.exam_board} ${t.qualification_level})`);
      console.log(`  "${t.plain_english_summary.substring(0, 100)}..."`);
    });
  }
  
  // Check for Biology specifically
  const { data: biologyCheck } = await supabase
    .from('topic_ai_metadata')
    .select('subject_name')
    .ilike('subject_name', '%biology%')
    .limit(5);
  
  if (biologyCheck && biologyCheck.length > 0) {
    console.log('\n✅ Biology subjects found:');
    biologyCheck.forEach(b => console.log(`  - ${b.subject_name}`));
  } else {
    console.log('\n❌ No subjects with "biology" in the name');
  }
  
  // Check total count
  const { count } = await supabase
    .from('topic_ai_metadata')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📈 Total topics with metadata: ${count}`);
}

checkSubjects();
