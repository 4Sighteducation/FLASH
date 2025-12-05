# Testing Staging Database in FLASH App

**Date:** November 21, 2025  
**Goal:** Connect FLASH app to staging curriculum data and verify it works  
**Time Estimate:** 1-2 hours

---

## 📊 CURRENT DATABASE STATE

### Staging Tables (Edexcel Data)
```
staging_aqa_subjects
├─ 61 Edexcel subjects (A-Level + GCSE)
├─ Contains: code, name, qualification_type, exam_board
└─ Column: exam_board = 'Edexcel'

staging_aqa_topics
├─ ~10,000+ topics
├─ Hierarchical with parent_topic_id
├─ 3-6 levels deep depending on subject
└─ Links to staging_aqa_subjects via subject_id

staging_aqa_exam_papers
├─ ~850+ paper sets
├─ Question papers + Mark schemes + Reports
└─ Links to staging_aqa_subjects via subject_id
```

### Production Tables (Current App Uses)
```
exam_boards (6 boards including Edexcel)
qualification_types (5 types)
exam_board_subjects (80+ subjects, mostly AQA)
curriculum_topics (12,000+ topics, mixed quality)
```

---

## 🎯 TESTING STRATEGY

### Option 1: Quick Test (Recommended First)
**Connect app directly to staging tables to verify data quality**

### Option 2: Full Migration
**Move staging → production, then test**

Let's do **Option 1** first to see what we're working with.

---

## 🔧 STEP-BY-STEP TESTING GUIDE

### Step 1: Create Test Database Views (5 minutes)

Create views that make staging tables look like production tables:

```sql
-- Create in Supabase SQL Editor

-- View: Subjects
CREATE OR REPLACE VIEW test_exam_board_subjects AS
SELECT 
  s.id,
  s.code as subject_code,
  s.name as subject_name,
  eb.id as exam_board_id,
  qt.id as qualification_type_id,
  true as is_current,
  s.created_at,
  s.updated_at
FROM staging_aqa_subjects s
JOIN exam_boards eb ON s.exam_board = eb.code
JOIN qualification_types qt ON s.qualification_type = qt.code
WHERE s.exam_board = 'Edexcel';

-- View: Topics
CREATE OR REPLACE VIEW test_curriculum_topics AS
SELECT 
  t.id,
  s.id as exam_board_subject_id,
  t.topic_code,
  t.topic_name,
  t.topic_level,
  t.parent_topic_id,
  t.sort_order,
  t.created_at,
  t.updated_at
FROM staging_aqa_topics t
JOIN staging_aqa_subjects s ON t.subject_id = s.id
WHERE s.exam_board = 'Edexcel';

-- Verify views work
SELECT 
  s.subject_name,
  COUNT(t.id) as topic_count,
  MAX(t.topic_level) as max_depth
FROM test_exam_board_subjects s
LEFT JOIN test_curriculum_topics t ON s.id = t.exam_board_subject_id
GROUP BY s.subject_name
ORDER BY topic_count DESC
LIMIT 10;
```

**Expected Output:**
```
subject_name          | topic_count | max_depth
----------------------|-------------|----------
Economics B           | 660         | 4
Economics A           | 663         | 4
Business              | 613         | 4
Physics               | 250         | 3
Chemistry             | 265         | 3
```

---

### Step 2: Create Test Service (10 minutes)

Create a service file to test staging data queries:

```typescript
// src/services/stagingTest.ts
import { supabase } from './supabase';

interface StagingSubject {
  id: string;
  subject_name: string;
  subject_code: string;
  exam_board_id: string;
  qualification_type_id: string;
}

interface StagingTopic {
  id: string;
  topic_name: string;
  topic_code: string;
  topic_level: number;
  parent_topic_id: string | null;
  exam_board_subject_id: string;
}

export class StagingDataTest {
  /**
   * Get Edexcel A-Level subjects from staging
   */
  static async getEdexcelALevelSubjects(): Promise<StagingSubject[]> {
    const { data: qualType } = await supabase
      .from('qualification_types')
      .select('id')
      .eq('code', 'A_LEVEL')
      .single();

    if (!qualType) throw new Error('A-Level qualification type not found');

    const { data, error } = await supabase
      .from('test_exam_board_subjects')
      .select('*')
      .eq('qualification_type_id', qualType.id)
      .order('subject_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get topics for a subject with full hierarchy
   */
  static async getSubjectTopics(subjectId: string): Promise<StagingTopic[]> {
    const { data, error } = await supabase
      .from('test_curriculum_topics')
      .select('*')
      .eq('exam_board_subject_id', subjectId)
      .order('sort_order')
      .order('topic_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get topic hierarchy (breadcrumb trail)
   */
  static async getTopicHierarchy(topicId: string): Promise<StagingTopic[]> {
    // Get the topic
    const { data: topic, error: topicError } = await supabase
      .from('test_curriculum_topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (topicError) throw topicError;
    if (!topic) return [];

    const hierarchy: StagingTopic[] = [topic];

    // Recursively get parents
    let currentTopic = topic;
    while (currentTopic.parent_topic_id) {
      const { data: parent, error: parentError } = await supabase
        .from('test_curriculum_topics')
        .select('*')
        .eq('id', currentTopic.parent_topic_id)
        .single();

      if (parentError || !parent) break;
      
      hierarchy.unshift(parent); // Add to start
      currentTopic = parent;
    }

    return hierarchy;
  }

  /**
   * Search topics by name
   */
  static async searchTopics(query: string, subjectId?: string): Promise<StagingTopic[]> {
    let queryBuilder = supabase
      .from('test_curriculum_topics')
      .select('*')
      .ilike('topic_name', `%${query}%`);

    if (subjectId) {
      queryBuilder = queryBuilder.eq('exam_board_subject_id', subjectId);
    }

    const { data, error } = await queryBuilder
      .limit(50)
      .order('topic_level')
      .order('topic_name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get topic statistics for a subject
   */
  static async getSubjectStats(subjectId: string) {
    const topics = await this.getSubjectTopics(subjectId);

    const stats = {
      total: topics.length,
      byLevel: {} as Record<number, number>,
      maxDepth: 0,
      topLevelTopics: topics.filter(t => t.parent_topic_id === null).length,
    };

    topics.forEach(topic => {
      stats.byLevel[topic.topic_level] = (stats.byLevel[topic.topic_level] || 0) + 1;
      if (topic.topic_level > stats.maxDepth) {
        stats.maxDepth = topic.topic_level;
      }
    });

    return stats;
  }
}
```

---

### Step 3: Create Test Screen (20 minutes)

Create a test screen to explore staging data:

```typescript
// src/screens/admin/StagingDataTest.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StagingDataTest } from '../../services/stagingTest';

export default function StagingDataTestScreen() {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const data = await StagingDataTest.getEdexcelALevelSubjects();
      setSubjects(data);
      console.log(`✅ Loaded ${data.length} Edexcel A-Level subjects`);
    } catch (error) {
      console.error('❌ Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const selectSubject = async (subject: any) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      const [topicData, statsData] = await Promise.all([
        StagingDataTest.getSubjectTopics(subject.id),
        StagingDataTest.getSubjectStats(subject.id),
      ]);
      
      setTopics(topicData);
      setStats(statsData);
      
      console.log(`✅ Loaded ${topicData.length} topics`);
      console.log('📊 Stats:', statsData);
    } catch (error) {
      console.error('❌ Error loading topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const testHierarchy = async (topicId: string) => {
    try {
      const hierarchy = await StagingDataTest.getTopicHierarchy(topicId);
      const breadcrumb = hierarchy.map(t => t.topic_name).join(' > ');
      Alert.alert('Topic Hierarchy', breadcrumb);
      console.log('🔍 Hierarchy:', hierarchy);
    } catch (error) {
      console.error('❌ Error loading hierarchy:', error);
    }
  };

  const testSearch = async () => {
    try {
      const results = await StagingDataTest.searchTopics('market', selectedSubject?.id);
      Alert.alert('Search Results', `Found ${results.length} topics containing "market"`);
      console.log('🔍 Search results:', results);
    } catch (error) {
      console.error('❌ Error searching:', error);
    }
  };

  if (loading && !selectedSubject) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00F5FF" />
        <Text style={styles.loadingText}>Loading subjects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 Staging Data Test</Text>
          <Text style={styles.subtitle}>Testing Edexcel A-Level Data</Text>
        </View>

        {!selectedSubject ? (
          <>
            <Text style={styles.sectionTitle}>
              Subjects ({subjects.length})
            </Text>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={styles.card}
                onPress={() => selectSubject(subject)}
              >
                <Text style={styles.subjectName}>{subject.subject_name}</Text>
                <Text style={styles.subjectCode}>{subject.subject_code}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedSubject(null);
                setTopics([]);
                setStats(null);
              }}
            >
              <Text style={styles.backText}>← Back to Subjects</Text>
            </TouchableOpacity>

            <View style={styles.statsBox}>
              <Text style={styles.statsTitle}>{selectedSubject.subject_name}</Text>
              {stats && (
                <>
                  <Text style={styles.statsText}>Total Topics: {stats.total}</Text>
                  <Text style={styles.statsText}>Max Depth: {stats.maxDepth} levels</Text>
                  <Text style={styles.statsText}>Top-Level: {stats.topLevelTopics}</Text>
                  <Text style={styles.statsText}>
                    By Level: {JSON.stringify(stats.byLevel)}
                  </Text>
                </>
              )}
              <TouchableOpacity style={styles.testButton} onPress={testSearch}>
                <Text style={styles.testButtonText}>Test Search</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>
              Topics ({topics.length}) - Top Level Only
            </Text>
            {loading ? (
              <ActivityIndicator size="large" color="#00F5FF" />
            ) : (
              topics
                .filter(t => t.parent_topic_id === null)
                .map((topic) => (
                  <TouchableOpacity
                    key={topic.id}
                    style={styles.topicCard}
                    onPress={() => testHierarchy(topic.id)}
                  >
                    <Text style={styles.topicName}>{topic.topic_name}</Text>
                    <Text style={styles.topicCode}>
                      {topic.topic_code} • Level {topic.topic_level}
                    </Text>
                  </TouchableOpacity>
                ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0f1e',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00F5FF',
    padding: 24,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  subjectCode: {
    fontSize: 14,
    color: '#64748B',
  },
  backButton: {
    padding: 24,
    paddingBottom: 12,
  },
  backText: {
    fontSize: 16,
    color: '#00F5FF',
  },
  statsBox: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00F5FF',
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#00F5FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0f1e',
  },
  topicCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: 24,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicName: {
    fontSize: 16,
    color: '#E2E8F0',
    marginBottom: 4,
  },
  topicCode: {
    fontSize: 12,
    color: '#64748B',
  },
});
```

---

### Step 4: Add to Admin Navigation (5 minutes)

Add test screen to admin menu:

```typescript
// src/screens/admin/AdminDashboard.tsx

// Add button
<TouchableOpacity
  style={styles.testButton}
  onPress={() => navigation.navigate('StagingDataTest' as never)}
>
  <Text style={styles.testButtonText}>🧪 Test Staging Data</Text>
</TouchableOpacity>
```

```typescript
// Add to navigation stack (wherever admin routes are defined)
<Stack.Screen 
  name="StagingDataTest" 
  component={StagingDataTestScreen}
  options={{ title: 'Staging Data Test' }}
/>
```

---

### Step 5: Run Tests (10 minutes)

1. **Start app in development mode**
   ```bash
   cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"
   npm start
   ```

2. **Navigate to Admin → Test Staging Data**

3. **Test each function:**
   - ✅ See list of Edexcel A-Level subjects
   - ✅ Click Business → See 613 topics
   - ✅ Verify hierarchy (5 levels)
   - ✅ Click a topic → See breadcrumb trail
   - ✅ Test search → Find topics with "market"

4. **Check console logs:**
   ```
   ✅ Loaded 33 Edexcel A-Level subjects
   ✅ Loaded 613 topics
   📊 Stats: { total: 613, maxDepth: 4, ... }
   🔍 Hierarchy: [Theme 1, 1.1 Meeting needs, ...]
   ```

---

## ✅ EXPECTED RESULTS

### If Everything Works
```
Subjects Load: ✅
- See 33 Edexcel A-Level subjects
- Names displayed correctly
- Codes match (9BS0, 9CH0, etc.)

Topics Load: ✅
- Business shows 613 topics
- Economics A shows 663 topics
- Hierarchy preserved (parent_topic_id works)

Hierarchy: ✅
- Clicking topic shows full breadcrumb
- e.g., "Theme 1 > 1.1 Customer needs > 1.1.1 Markets"

Search: ✅
- Search "market" finds relevant topics
- Results from correct subject
```

### If Something Breaks
```
❌ Views don't exist
→ Run Step 1 SQL again

❌ No subjects load
→ Check exam_board = 'Edexcel' in staging_aqa_subjects
→ Verify exam_boards table has 'Edexcel' row

❌ Topics don't link to subjects
→ Check subject_id in staging_aqa_topics matches staging_aqa_subjects.id

❌ Hierarchy broken
→ Verify parent_topic_id values exist in same table
```

---

## 🎯 NEXT STEPS AFTER SUCCESSFUL TEST

### If Test Passes ✅
1. **Create proper migration script**
   - Move staging → production tables
   - Preserve hierarchy
   - Handle duplicates

2. **Update app to use production tables**
   - Remove test views
   - Update all queries to use curriculum_topics

3. **Test flashcard generation**
   - Use full topic context
   - Verify AI gets hierarchical data

### If Test Fails ❌
1. **Fix data issues in staging**
2. **Document problems found**
3. **Re-run scrapers if needed**

---

## 📝 CHECKLIST

- [ ] Create database views
- [ ] Add StagingDataTest service
- [ ] Create test screen component
- [ ] Add to admin navigation
- [ ] Run app and test
- [ ] Verify subject list loads
- [ ] Verify topics load with hierarchy
- [ ] Test search functionality
- [ ] Check console logs for errors
- [ ] Document any issues found

---

**Time Investment:** 1-2 hours  
**Value:** Know exactly what data we have before building AI search  
**Risk:** Low (read-only testing, no changes to production)

Let's do this! 🚀



