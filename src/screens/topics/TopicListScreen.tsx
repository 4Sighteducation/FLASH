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

interface CurriculumTopic {
  id: string;
  topic_name: string;
  topic_level: number;
  parent_topic_id: string | null;
  exam_board_subject_id: string;
  sort_order: number;
}

interface TopicNode {
  id: string;
  name: string;
  level: number;
  children: TopicNode[];
  isCollapsed?: boolean; // For cases where module = topic
  originalLevel: number;
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

  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [topicTree, setTopicTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCurriculumTopics();
  }, []);

  const fetchCurriculumTopics = async () => {
    try {
      // Fetch all curriculum topics for this subject
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('*')
        .eq('exam_board_subject_id', subjectId)
        .order('topic_level')
        .order('sort_order');

      if (error) throw error;
      
      if (data) {
        setTopics(data);
        const tree = buildTopicTree(data);
        setTopicTree(tree);
      }
    } catch (error) {
      console.error('Error fetching curriculum topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTopicTree = (topics: CurriculumTopic[]): TopicNode[] => {
    const topicMap = new Map<string, TopicNode>();
    const rootNodes: TopicNode[] = [];

    // First, create all nodes
    topics.forEach(topic => {
      topicMap.set(topic.id, {
        id: topic.id,
        name: topic.topic_name,
        level: topic.topic_level,
        originalLevel: topic.topic_level,
        children: [],
      });
    });

    // Then, build the tree structure
    topics.forEach(topic => {
      const node = topicMap.get(topic.id)!;
      
      if (topic.parent_topic_id) {
        const parent = topicMap.get(topic.parent_topic_id);
        if (parent) {
          // Check if parent has same name (module = topic case)
          if (parent.name === node.name && parent.level === 1 && node.level === 2) {
            // Collapse this level - move children up
            node.isCollapsed = true;
            parent.isCollapsed = true;
          } else {
            parent.children.push(node);
          }
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Handle collapsed nodes - promote grandchildren
    const processCollapsedNodes = (nodes: TopicNode[]): TopicNode[] => {
      return nodes.map(node => {
        if (node.isCollapsed && node.children.length > 0) {
          // Find the child with same name
          const collapsedChild = node.children.find(child => child.name === node.name);
          if (collapsedChild && collapsedChild.children.length > 0) {
            // Replace children with grandchildren
            node.children = collapsedChild.children;
          }
        }
        node.children = processCollapsedNodes(node.children);
        return node;
      });
    };

    return processCollapsedNodes(rootNodes);
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

  const handleCreateFlashcards = (topic: TopicNode) => {
    navigation.navigate('CreateCard' as never, {
      topicId: topic.id,
      topicName: topic.name,
      subjectName,
    } as never);
  };

  const handleAIGenerate = (topic: TopicNode) => {
    navigation.navigate('AIGenerator' as never, {
      subject: subjectName,
      topic: topic.name,
      topicId: topic.id,
      examBoard: route.params.examBoard || 'AQA', // Default exam board
      examType: route.params.examType || 'GCSE', // Default exam type
    } as never);
  };

  const renderTopicNode = (node: TopicNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedTopics.has(node.id);

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.topicItem,
            { marginLeft: depth * 20 },
            depth === 0 && styles.parentTopic,
            depth === 1 && styles.midLevelTopic,
          ]}
          onPress={() => hasChildren ? toggleExpanded(node.id) : handleCreateFlashcards(node)}
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
            <View style={styles.topicTextContainer}>
              <Text style={[
                styles.topicTitle, 
                depth === 0 && styles.moduleTitle,
                depth === 1 && styles.topicTitleText,
                depth === 2 && styles.subTopicTitle,
              ]}>
                {node.name}
              </Text>
              {depth === 0 && hasChildren && (
                <Text style={styles.childCount}>
                  {node.children.length} {node.children.length === 1 ? 'topic' : 'topics'}
                </Text>
              )}
            </View>
          </View>
          {!hasChildren && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleAIGenerate(node)}
              >
                <Ionicons name="sparkles" size={20} color="#FF6B6B" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleCreateFlashcards(node)}
              >
                <Ionicons name="add-circle" size={24} color={subjectColor || '#6366F1'} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
        {isExpanded && node.children.map(child => renderTopicNode(child, depth + 1))}
      </View>
    );
  };

  const getTotalTopicCount = (nodes: TopicNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + getTotalTopicCount(node.children);
    }, 0);
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

  const totalCount = getTotalTopicCount(topicTree);

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
            <Text style={styles.topicCount}>{totalCount} topics</Text>
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
        {topicTree.length > 0 ? (
          topicTree.map(node => renderTopicNode(node))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No topics available</Text>
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
    backgroundColor: '#F3F4F6',
  },
  midLevelTopic: {
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  topicContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginRight: 8,
  },
  topicTextContainer: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    color: '#1F2937',
  },
  moduleTitle: {
    fontWeight: '700',
    fontSize: 17,
    color: '#111827',
  },
  topicTitleText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#374151',
  },
  subTopicTitle: {
    fontWeight: '400',
    fontSize: 15,
    color: '#6B7280',
  },
  childCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  createButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
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