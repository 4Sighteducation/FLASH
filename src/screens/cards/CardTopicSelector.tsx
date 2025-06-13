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
  isCollapsed?: boolean;
  originalLevel: number;
}

export default function CardTopicSelector() {
  const route = useRoute();
  const navigation = useNavigation();
  const { subjectId, subjectName, subjectColor, examBoard, examType } = route.params as any;

  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [topicTree, setTopicTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCurriculumTopics();
  }, [subjectId]);

  const fetchCurriculumTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('curriculum_topics')
        .select('*')
        .eq('exam_board_subject_id', subjectId)
        .order('topic_level')
        .order('sort_order');

      if (error) throw error;
      
      // Load user customizations (including deletions)
      const { data: customTopics } = await supabase
        .from('user_custom_topics')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('subject_id', subjectId);

      // Create a map of customizations
      const customMap = new Map();
      customTopics?.forEach(custom => {
        customMap.set(custom.original_topic_id, custom);
      });

      // Filter and modify topics based on customizations
      const processedTopics = (data || []).filter(topic => {
        const custom = customMap.get(topic.id);
        // Skip if marked as deleted
        if (custom?.is_deleted) {
          return false;
        }
        // Update title if customized
        if (custom?.title) {
          topic.topic_name = custom.title;
        }
        return true;
      });
      
      if (processedTopics) {
        setTopics(processedTopics);
        const tree = buildTopicTree(processedTopics);
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

  const handleTopicPress = (topic: TopicNode) => {
    if (topic.children.length > 0) {
      toggleExpanded(topic.id);
    } else {
      // Navigate to card creation choice
      navigation.navigate('CardCreationChoice' as never, {
        topicId: topic.id,
        topicName: topic.name,
        subjectName,
        examBoard,
        examType,
      } as never);
    }
  };

  const renderTopicNode = (node: TopicNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedTopics.has(node.id);
    
    const getLighterShade = (color: string, level: number): string => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      const factor = 1 - (level * 0.15);
      const newR = Math.round(r + (255 - r) * (1 - factor));
      const newG = Math.round(g + (255 - g) * (1 - factor));
      const newB = Math.round(b + (255 - b) * (1 - factor));
      
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    const nodeColor = getLighterShade(subjectColor || '#6366F1', depth);
    const borderColor = subjectColor || '#6366F1';

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.topicItem,
            { 
              marginLeft: depth * 20,
              backgroundColor: nodeColor,
              borderLeftColor: borderColor,
              borderLeftWidth: depth === 0 ? 4 : depth === 1 ? 3 : 2,
            },
          ]}
          onPress={() => handleTopicPress(node)}
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
            <Text style={[
              styles.topicTitle, 
              depth === 0 && styles.moduleTitle,
              depth === 1 && styles.topicTitleText,
              depth === 2 && styles.subTopicTitle,
            ]}>
              {node.name}
            </Text>
          </View>
          {!hasChildren && (
            <Ionicons name="add-circle-outline" size={24} color={subjectColor || '#6366F1'} />
          )}
        </TouchableOpacity>
        {isExpanded && node.children.map(child => renderTopicNode(child, depth + 1))}
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
            <Text style={styles.headerTitle}>Select Topic</Text>
            <Text style={styles.subjectName}>{subjectName}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.subtitle}>Choose a topic to create cards for:</Text>
        {topicTree.length > 0 ? (
          topicTree.map(node => renderTopicNode(node))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No topics available</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subjectName: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
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
  moduleTitle: {
    fontWeight: '600',
    fontSize: 17,
  },
  topicTitleText: {
    fontWeight: '500',
  },
  subTopicTitle: {
    fontSize: 15,
    color: '#4B5563',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
}); 