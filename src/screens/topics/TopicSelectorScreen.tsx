import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ExamBoard {
  id: string;
  code: string;
  full_name: string;
}

interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  exam_board_id: string;
}

interface Topic {
  id: string;
  topic_name: string;
  topic_code: string;
  topic_level: number;
  parent_topic_id: string | null;
  exam_board_subject_id: string;
}

export default function TopicSelectorScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selectedExamBoard, setSelectedExamBoard] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExamBoards();
  }, []);

  useEffect(() => {
    if (selectedExamBoard) {
      fetchSubjects(selectedExamBoard);
      setSelectedSubject(null);
      setSelectedTopics(new Set());
    }
  }, [selectedExamBoard]);

  useEffect(() => {
    if (selectedSubject) {
      fetchTopics(selectedSubject);
    }
  }, [selectedSubject]);

  const fetchExamBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('*')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setExamBoards(data || []);
    } catch (error) {
      console.error('Error fetching exam boards:', error);
      Alert.alert('Error', 'Failed to load exam boards');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (examBoardId: string) => {
    try {
      const { data, error } = await supabase
        .from('exam_board_subjects')
        .select('*')
        .eq('exam_board_id', examBoardId)
        .eq('is_current', true)
        .order('subject_name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    }
  };

  const fetchTopics = async (subjectId: string) => {
    try {
      // Fetch only top-level topics (where parent_topic_id is null)
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('*')
        .eq('exam_board_subject_id', subjectId)
        .is('parent_topic_id', null)
        .order('sort_order')
        .order('topic_name');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    }
  };

  const toggleTopic = (topicId: string) => {
    const newSelectedTopics = new Set(selectedTopics);
    if (newSelectedTopics.has(topicId)) {
      newSelectedTopics.delete(topicId);
    } else {
      newSelectedTopics.add(topicId);
    }
    setSelectedTopics(newSelectedTopics);
  };

  const saveSelectedTopics = async () => {
    if (selectedTopics.size === 0) {
      Alert.alert('No Topics Selected', 'Please select at least one topic to study');
      return;
    }

    try {
      // Save user's selected topics to the database
      const topicsArray = Array.from(selectedTopics);
      
      // First, delete existing user topics
      await supabase
        .from('user_topics')
        .delete()
        .eq('user_id', user?.id);

      // Then insert new selections
      const userTopics = topicsArray.map(topicId => ({
        user_id: user?.id,
        topic_id: topicId,
      }));

      const { error } = await supabase
        .from('user_topics')
        .insert(userTopics);

      if (error) throw error;

      Alert.alert('Success', 'Topics saved successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving topics:', error);
      Alert.alert('Error', 'Failed to save topics');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Topics</Text>
        <TouchableOpacity onPress={saveSelectedTopics}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Exam Board Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exam Board</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {examBoards.map((board) => (
              <TouchableOpacity
                key={board.id}
                style={[
                  styles.chip,
                  selectedExamBoard === board.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedExamBoard(board.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedExamBoard === board.id && styles.chipTextSelected,
                  ]}
                >
                  {board.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Subject Selection */}
        {selectedExamBoard && subjects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.chip,
                    selectedSubject === subject.id && styles.chipSelected,
                  ]}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedSubject === subject.id && styles.chipTextSelected,
                    ]}
                  >
                    {subject.subject_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Topic Selection */}
        {selectedSubject && topics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Topics ({selectedTopics.size} selected)
            </Text>
            {topics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[
                  styles.topicItem,
                  selectedTopics.has(topic.id) && styles.topicItemSelected,
                ]}
                onPress={() => toggleTopic(topic.id)}
              >
                <View style={styles.topicContent}>
                  <Text
                    style={[
                      styles.topicText,
                      selectedTopics.has(topic.id) && styles.topicTextSelected,
                    ]}
                  >
                    {topic.topic_name}
                  </Text>
                  {topic.topic_code && (
                    <Text style={styles.topicCode}>{topic.topic_code}</Text>
                  )}
                </View>
                {selectedTopics.has(topic.id) && (
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  topicItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  topicContent: {
    flex: 1,
    marginRight: 10,
  },
  topicText: {
    fontSize: 16,
    color: '#333',
  },
  topicTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  topicCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
}); 