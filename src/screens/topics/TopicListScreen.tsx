import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Topic {
  id: string;
  title: string;
  parent_topic_id: string | null;
  color: string;
  is_deleted: boolean;
  sort_order: number;
}

export default function TopicListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { subjectId, subjectName, subjectColor } = route.params as {
    subjectId: string;
    subjectName: string;
    subjectColor: string;
  };

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_custom_topics')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_id', subjectId)
        .eq('is_deleted', false)
        .order('sort_order');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (topicId: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleCreateFlashcards = (topic: Topic) => {
    navigation.navigate('CreateCard' as never, {
      topicId: topic.id,
      topicName: topic.title,
      subjectName,
    } as never);
  };

  const renderTopic = (topic: Topic, level: number = 0) => {
    const childTopics = topics.filter(t => t.parent_topic_id === topic.id);
    const hasChildren = childTopics.length > 0;
    const isExpanded = expandedTopics.has(topic.id);

    return (
      <View key={topic.id}>
        <TouchableOpacity
          style={[
            styles.topicItem,
            { marginLeft: level * 20 },
            level === 0 && styles.parentTopic,
          ]}
          onPress={() => hasChildren ? toggleExpanded(topic.id) : handleCreateFlashcards(topic)}
        >
          <View style={styles.topicContent}>
            {hasChildren && (
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={20}
                color="#6B7280"
                style={styles.expandIcon}
              />
            )}
            <Text style={[styles.topicTitle, level === 0 && styles.parentTopicTitle]}>
              {topic.title}
            </Text>
          </View>
          {!hasChildren && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => handleCreateFlashcards(topic)}
            >
              <Ionicons name="add-circle" size={24} color={subjectColor || '#6366F1'} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {isExpanded && childTopics.map(child => renderTopic(child, level + 1))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[subjectColor || '#6366F1', '#8B5CF6']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.subjectName}>{subjectName}</Text>
            <Text style={styles.topicCount}>{topics.length} topics</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('TopicEdit' as never, {
              subjectId,
              subjectName,
            } as never)}
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {topics.filter(t => !t.parent_topic_id).length > 0 ? (
          topics
            .filter(t => !t.parent_topic_id)
            .map(topic => renderTopic(topic))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No topics added yet</Text>
            <TouchableOpacity
              style={styles.addTopicButton}
              onPress={() => navigation.navigate('TopicEdit' as never, {
                subjectId,
                subjectName,
              } as never)}
            >
              <Text style={styles.addTopicText}>Customize Topics</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Study' as never, {
          subjectId,
          subjectName,
        } as never)}
      >
        <Ionicons name="play" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 20,
  },
  subjectName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  topicCount: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  topicItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  parentTopic: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  topicContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginRight: 8,
  },
  topicTitle: {
    fontSize: 16,
    color: '#1F2937',
  },
  parentTopicTitle: {
    fontWeight: '600',
  },
  createButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  addTopicButton: {
    marginTop: 15,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addTopicText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
}); 