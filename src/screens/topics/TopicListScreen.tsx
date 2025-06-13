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
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from 'react-native';
import { notificationService } from '../../services/notificationService';
import NotificationBadge from '../../components/NotificationBadge';

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
  flashcardCount?: number;
  priority?: number;
}

const PRIORITY_LEVELS = [
  { value: 1, label: 'Netflix & Chill', color: '#10B981', emoji: '😎' },
  { value: 2, label: 'Casual Review', color: '#3B82F6', emoji: '📚' },
  { value: 3, label: 'Getting Serious', color: '#F59E0B', emoji: '🎯' },
  { value: 4, label: 'Crunch Time', color: '#F97316', emoji: '⏰' },
  { value: 5, label: 'Emergency Mode!', color: '#EF4444', emoji: '🚨' },
];

// Helper function to get lighter shade of color
const getLighterShade = (color: string, level: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Make it progressively lighter based on level
  const factor = 1 - (level * 0.15); // 15% lighter per level
  const newR = Math.round(r + (255 - r) * (1 - factor));
  const newG = Math.round(g + (255 - g) * (1 - factor));
  const newB = Math.round(b + (255 - b) * (1 - factor));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export default function TopicListScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { subjectId, subjectName, subjectColor } = route.params as any;

  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [topicTree, setTopicTree] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [flashcardCounts, setFlashcardCounts] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [priorities, setPriorities] = useState<Map<string, number>>(new Map());
  const [viewMode, setViewMode] = useState<'hierarchy' | 'priority'>('hierarchy');
  const [topicStudyPreferences, setTopicStudyPreferences] = useState<Map<string, boolean>>(new Map());
  const [cardsDue, setCardsDue] = useState<any>({ total: 0, byTopic: {} });

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const dueCount = await notificationService.getCardsDueCount(user.id);
      setCardsDue(dueCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCurriculumTopics();
      fetchFlashcardCounts();
      fetchPriorities();
      fetchTopicStudyPreferences();
      fetchNotifications();
    }, [subjectName, user?.id, subjectId])
  );

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
        .eq('user_id', user?.id)
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

  const fetchFlashcardCounts = async () => {
    if (!user?.id || !subjectName) return;
    
    try {
      setRefreshing(true);
      // Get all flashcards for this subject
      const { data, error } = await supabase
        .from('flashcards')
        .select('topic')
        .eq('user_id', user?.id)
        .eq('subject_name', subjectName);

      if (error) throw error;

      // Count flashcards per topic
      const counts = new Map<string, number>();
      if (data) {
        data.forEach((card: any) => {
          if (card.topic) {
            counts.set(card.topic, (counts.get(card.topic) || 0) + 1);
          }
        });
      }
      setFlashcardCounts(counts);
    } catch (error) {
      console.error('Error fetching flashcard counts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPriorities = async () => {
    try {
      const { data, error } = await supabase
        .from('user_topic_priorities')
        .select('topic_id, priority')
        .eq('user_id', user?.id);

      if (error) throw error;

      const priorityMap = new Map();
      data?.forEach((p: any) => priorityMap.set(p.topic_id, p.priority));
      setPriorities(priorityMap);
    } catch (error) {
      console.error('Error fetching priorities:', error);
    }
  };

  const fetchTopicStudyPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('topic_study_preferences')
        .select('topic_id, in_study_bank')
        .eq('user_id', user?.id);

      if (error) throw error;

      const prefsMap = new Map();
      data?.forEach((p: any) => prefsMap.set(p.topic_id, p.in_study_bank));
      setTopicStudyPreferences(prefsMap);
    } catch (error) {
      console.error('Error fetching topic study preferences:', error);
    }
  };

  const buildTopicTree = (topics: CurriculumTopic[]): TopicNode[] => {
    const topicMap = new Map<string, TopicNode>();
    const rootNodes: TopicNode[] = [];

    // First, create all nodes
    topics.forEach(topic => {
      const flashcardCount = flashcardCounts.get(topic.topic_name) || 0;
      const priority = priorities.get(topic.id);
      topicMap.set(topic.id, {
        id: topic.id,
        name: topic.topic_name,
        level: topic.topic_level,
        originalLevel: topic.topic_level,
        children: [],
        flashcardCount,
        priority,
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

    // Update flashcard counts to include children
    const updateParentCounts = (nodes: TopicNode[]): number => {
      let totalCount = 0;
      nodes.forEach(node => {
        const childrenCount = updateParentCounts(node.children);
        node.flashcardCount = (node.flashcardCount || 0) + childrenCount;
        totalCount += node.flashcardCount || 0;
      });
      return totalCount;
    };

    const processedNodes = processCollapsedNodes(rootNodes);
    updateParentCounts(processedNodes);
    
    return processedNodes;
  };

  // Re-build tree when flashcard counts or priorities change
  useEffect(() => {
    if (topics.length > 0 && !loading) {
      const tree = buildTopicTree(topics);
      setTopicTree(tree);
    }
  }, [flashcardCounts, topics, priorities]);

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
    const topicCardCount = flashcardCounts.get(topic.name) || 0;
    
    if (topicCardCount > 0) {
      // Navigate to Flashcards screen with topic filter
      navigation.navigate('Flashcards' as never, {
        subjectName,
        subjectColor: subjectColor || '#6366F1',
        examBoard: route.params?.examBoard,
        examType: route.params?.examType,
        topicFilter: topic.name, // Add topic filter
      } as never);
    } else {
      // If no cards, show creation options
      navigation.navigate('CardCreationChoice' as never, {
        topicId: topic.id,
        topicName: topic.name,
        subjectName,
        examBoard: route.params?.examBoard || 'AQA',
        examType: route.params?.examType || 'GCSE',
      } as never);
    }
  };

  const handleCreateManual = (topic: TopicNode) => {
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
      examBoard: route.params?.examBoard || 'AQA',
      examType: route.params?.examType || 'GCSE',
    } as never);
  };

  const handleImageCreate = (topic: TopicNode) => {
    navigation.navigate('ImageCardGenerator' as never, {
      topicId: topic.id,
      topicName: topic.name,
      subjectName,
      examBoard: route.params?.examBoard || 'AQA',
      examType: route.params?.examType || 'GCSE',
    } as never);
  };

  const toggleStudyBank = async (topicId: string, currentlyInStudyBank: boolean) => {
    try {
      const newStatus = !currentlyInStudyBank;
      
      // Update topic preference
      const { error: prefError } = await supabase
        .from('topic_study_preferences')
        .upsert({
          user_id: user?.id,
          topic_id: topicId,
          in_study_bank: newStatus,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (prefError) throw prefError;

      // Update all flashcards for this topic
      const { error: cardsError } = await supabase
        .from('flashcards')
        .update({
          in_study_bank: newStatus,
          added_to_study_bank_at: newStatus ? new Date().toISOString() : null
        })
        .eq('user_id', user?.id)
        .eq('topic_id', topicId);

      if (cardsError) throw cardsError;

      // Update local state
      setTopicStudyPreferences(prev => new Map(prev).set(topicId, newStatus));
      
      Alert.alert(
        'Success',
        newStatus 
          ? 'Topic added to Study Bank! Cards will appear in your study sessions.'
          : 'Topic removed from Study Bank. Cards remain in your Card Bank.'
      );
    } catch (error) {
      console.error('Error toggling study bank:', error);
      Alert.alert('Error', 'Failed to update study bank status');
    }
  };

  const renderTopicNode = (node: TopicNode, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedTopics.has(node.id);
    const hasFlashcards = (node.flashcardCount || 0) > 0;
    const priorityInfo = node.priority ? PRIORITY_LEVELS.find(p => p.value === node.priority) : null;
    const isInStudyBank = topicStudyPreferences.get(node.id) || false;
    
    // Calculate progress for parent nodes
    const calculateProgress = (node: TopicNode): { completed: number; total: number } => {
      if (!hasChildren) {
        return { completed: hasFlashcards ? 1 : 0, total: 1 };
      }
      
      let completed = 0;
      let total = 0;
      
      const countProgress = (n: TopicNode) => {
        if (n.children.length === 0) {
          total++;
          if ((n.flashcardCount || 0) > 0) completed++;
        } else {
          n.children.forEach(countProgress);
        }
      };
      
      node.children.forEach(countProgress);
      return { completed, total };
    };
    
    const progress = hasChildren ? calculateProgress(node) : null;
    const progressPercentage = progress ? (progress.completed / progress.total) * 100 : 0;
    
    // Calculate color based on depth and whether it has flashcards
    const nodeColor = hasFlashcards 
      ? getLighterShade(subjectColor || '#6366F1', depth)
      : '#FFFFFF';
    
    const borderColor = hasFlashcards
      ? subjectColor || '#6366F1'
      : depth === 0 ? '#6366F1' : depth === 1 ? '#8B5CF6' : '#E5E7EB';

    // Determine text color for better contrast
    const textColor = hasFlashcards ? '#FFFFFF' : '#1F2937';
    const subtextColor = hasFlashcards ? '#E0E7FF' : '#6B7280';

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.topicItem,
            { 
              marginLeft: depth * 20,
              backgroundColor: nodeColor,
              borderLeftColor: priorityInfo ? priorityInfo.color : borderColor,
              borderLeftWidth: priorityInfo ? 6 : hasFlashcards ? 4 : depth === 0 ? 4 : depth === 1 ? 3 : 2,
              position: 'relative',
            },
          ]}
          onPress={() => hasChildren ? toggleExpanded(node.id) : handleTopicPress(node)}
        >
          <View style={styles.topicContent}>
            {hasChildren && (
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={20}
                color={textColor}
                style={styles.expandIcon}
              />
            )}
            <View style={styles.topicTextContainer}>
              <View style={styles.topicTitleRow}>
                <Text style={[
                  styles.topicTitle, 
                  depth === 0 && styles.moduleTitle,
                  depth === 1 && styles.topicTitleText,
                  depth === 2 && styles.subTopicTitle,
                  { color: textColor },
                ]}>
                  {node.name}
                </Text>
              </View>
              {cardsDue.byTopic[`${subjectName}:${node.name}`] > 0 && (
                <View style={styles.topicDueBadge}>
                  <Text style={styles.topicDueBadgeText}>
                    {cardsDue.byTopic[`${subjectName}:${node.name}`]} due
                  </Text>
                </View>
              )}
              <View style={styles.topicMeta}>
                {priorityInfo && (
                  <View style={[styles.priorityIndicator, { backgroundColor: priorityInfo.color }]}>
                    <Text style={styles.priorityEmoji}>{priorityInfo.emoji}</Text>
                  </View>
                )}
                {depth === 0 && hasChildren && (
                  <Text style={[styles.childCount, { color: subtextColor }]}>
                    {node.children.length} {node.children.length === 1 ? 'topic' : 'topics'}
                  </Text>
                )}
                {hasFlashcards && (
                  <View style={[styles.flashcardBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                    <Ionicons name="albums-outline" size={12} color="#FFFFFF" />
                    <Text style={styles.flashcardCount}>{node.flashcardCount}</Text>
                  </View>
                )}
                {hasFlashcards && isInStudyBank && (
                  <View style={[styles.studyBankIndicator]}>
                    <Ionicons name="book" size={12} color="#10B981" />
                    <Text style={styles.studyBankText}>Study</Text>
                  </View>
                )}
                {progress && progress.total > 0 && (
                  <View style={styles.progressIndicator}>
                    <Text style={[styles.progressText, { color: subtextColor }]}>
                      {progress.completed}/{progress.total}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          {!hasChildren && (
            <View style={styles.actionButtons}>
              {hasFlashcards && (
                <TouchableOpacity
                  style={[
                    styles.actionButton, 
                    styles.studyBankButton,
                    isInStudyBank && styles.studyBankButtonActive
                  ]}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    toggleStudyBank(node.id, isInStudyBank);
                  }}
                >
                  <Ionicons 
                    name={isInStudyBank ? "book" : "book-outline"} 
                    size={20} 
                    color={isInStudyBank ? "#10B981" : "#6B7280"} 
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.aiButton]}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleAIGenerate(node);
                }}
              >
                <Ionicons name="flash" size={20} color="#FFD700" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.imageButton]}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleImageCreate(node);
                }}
              >
                <Ionicons name="camera" size={20} color="#4CAF50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e: any) => {
                  e.stopPropagation();
                  handleCreateManual(node);
                }}
              >
                <Ionicons name="create-outline" size={22} color={subjectColor || '#6366F1'} />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Progress bar for parent nodes */}
        {hasChildren && progress && progress.total > 0 && (
          <View style={[styles.progressBarContainer, { marginLeft: depth * 20 + 16 }]}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${progressPercentage}%`,
                    backgroundColor: progressPercentage === 100 
                      ? '#10B981' 
                      : progressPercentage >= 75 
                      ? '#3B82F6' 
                      : progressPercentage >= 50 
                      ? '#F59E0B' 
                      : progressPercentage >= 25 
                      ? '#F97316' 
                      : '#EF4444'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(progressPercentage)}% complete
            </Text>
          </View>
        )}
        
        {isExpanded && node.children.map(child => renderTopicNode(child, depth + 1))}
      </View>
    );
  };

  const getTotalTopicCount = (nodes: TopicNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + getTotalTopicCount(node.children);
    }, 0);
  };

  const getTotalFlashcardCount = (): number => {
    let total = 0;
    flashcardCounts.forEach(count => total += count);
    return total;
  };

  const renderPriorityView = () => {
    // Flatten all topics and get only those with priorities
    const flattenTopics = (nodes: TopicNode[]): TopicNode[] => {
      let result: TopicNode[] = [];
      nodes.forEach(node => {
        if (!node.children || node.children.length === 0) {
          if (node.priority) result.push(node);
        }
        if (node.children) {
          result = result.concat(flattenTopics(node.children));
        }
      });
      return result;
    };

    const prioritizedTopics = flattenTopics(topicTree)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return prioritizedTopics.map(node => {
      const priorityInfo = PRIORITY_LEVELS.find(p => p.value === node.priority);
      const hasFlashcards = (node.flashcardCount || 0) > 0;
      
      return (
        <TouchableOpacity
          key={node.id}
          style={[
            styles.priorityItem,
            { borderLeftColor: priorityInfo?.color, borderLeftWidth: 6 }
          ]}
          onPress={() => handleTopicPress(node)}
        >
          <View style={styles.priorityItemContent}>
            <View style={styles.priorityItemHeader}>
              <Text style={styles.priorityItemName}>{node.name}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityInfo?.color }]}>
                <Text style={styles.priorityEmoji}>{priorityInfo?.emoji}</Text>
              </View>
            </View>
            {hasFlashcards && (
              <View style={styles.priorityItemStats}>
                <Ionicons name="albums-outline" size={16} color="#6B7280" />
                <Text style={styles.priorityItemStat}>{node.flashcardCount} cards</Text>
              </View>
            )}
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.aiButton]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleAIGenerate(node);
              }}
            >
              <Ionicons name="flash" size={20} color="#FFD700" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.imageButton]}
              onPress={(e: any) => {
                e.stopPropagation();
                handleImageCreate(node);
              }}
            >
              <Ionicons name="camera" size={20} color="#4CAF50" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e: any) => {
                e.stopPropagation();
                handleCreateManual(node);
              }}
            >
              <Ionicons name="create-outline" size={22} color={subjectColor || '#6366F1'} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    });
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
  const totalFlashcards = getTotalFlashcardCount();

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
            <View style={styles.headerStats}>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{route.params?.examBoard || 'N/A'}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Text style={styles.metaText}>{route.params?.examType || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.headerStats}>
              <Text style={styles.topicCount}>{totalCount} topics</Text>
              {totalFlashcards > 0 && (
                <>
                  <Text style={styles.statSeparator}>•</Text>
                  <Text style={styles.topicCount}>{totalFlashcards} cards</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => {
                // Open color picker modal
                navigation.navigate('ColorPicker' as never, {
                  subjectId,
                  subjectName,
                  currentColor: subjectColor,
                } as never);
              }}
              style={styles.headerButton}
            >
              <Ionicons name="color-palette-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('TopicHub' as never, {
                subjectId,
                subjectName,
                subjectColor,
              } as never)}
              style={styles.headerButton}
            >
              <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'hierarchy' && styles.activeToggle]}
            onPress={() => setViewMode('hierarchy')}
          >
            <Ionicons name="git-branch" size={18} color={viewMode === 'hierarchy' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.toggleText, viewMode === 'hierarchy' && styles.activeToggleText]}>
              All Topics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'priority' && styles.activeToggle]}
            onPress={() => setViewMode('priority')}
          >
            <Ionicons name="flag" size={18} color={viewMode === 'priority' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.toggleText, viewMode === 'priority' && styles.activeToggleText]}>
              Priority Only
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'hierarchy' ? (
          topicTree.length > 0 ? (
            topicTree.map(node => renderTopicNode(node))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No topics available</Text>
            </View>
          )
        ) : (
          renderPriorityView().length > 0 ? (
            renderPriorityView()
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No priority topics set</Text>
              <Text style={styles.emptySubtext}>Use the Topic Hub to set priorities</Text>
            </View>
          )
        )}
      </ScrollView>

      {totalFlashcards > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: subjectColor || '#6366F1' }]}
          onPress={() => navigation.navigate('Flashcards' as never, {
            subjectName,
            subjectColor: subjectColor || '#6366F1',
            examBoard: route.params?.examBoard,
            examType: route.params?.examType,
          } as never)}
        >
          <Ionicons name="albums" size={24} color="#FFFFFF" />
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{totalFlashcards}</Text>
          </View>
        </TouchableOpacity>
      )}

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
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  topicCount: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  statSeparator: {
    fontSize: 14,
    color: '#E0E7FF',
    marginHorizontal: 8,
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
  topicMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  childCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  flashcardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  flashcardCount: {
    fontSize: 12,
    color: '#FFFFFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  aiButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    padding: 6,
  },
  imageButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 20,
    padding: 6,
  },
  studyBankButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 20,
    padding: 6,
  },
  studyBankButtonActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  studyBankIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    gap: 4,
  },
  studyBankText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
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
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  fabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'column',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressIndicator: {
    marginLeft: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarContainer: {
    marginTop: -8,
    marginBottom: 12,
    paddingRight: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeToggle: {
    backgroundColor: '#6366F1',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeToggleText: {
    color: '#FFFFFF',
  },
  priorityIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityEmoji: {
    fontSize: 14,
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  priorityItem: {
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
  priorityItemContent: {
    flex: 1,
  },
  priorityItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  priorityItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priorityItemStat: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  topicTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topicDueBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  topicDueBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
}); 