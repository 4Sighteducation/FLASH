import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';
import { TOPIC_PRIORITY_LEVELS } from '../../constants/topicPriorities';

// Priority levels are shared across the app:
// 1 = highest priority, 4 = lowest priority.
const PRIORITY_LEVELS = TOPIC_PRIORITY_LEVELS;

interface TopicNode {
  id: string;
  name: string;
  level: number;
  hasCards: boolean;
  cardCount: number;
  children: TopicNode[];
  parentId: string | null;
  priority: number | null;
}

interface SubjectData {
  subjectName: string;
  subjectColor: string;
  subjectId: string;
  examBoard: string;
  examType: string;
  rootTopics: TopicNode[];
  totalCards: number;
}

export default function ManageAllCardsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFullCurriculumWithCards();
  }, []);

  const loadFullCurriculumWithCards = async () => {
    try {
      setLoading(true);

      // 1. Get user's subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          color,
          exam_board,
          subject:exam_board_subjects!subject_id(
            subject_name
          )
        `)
        .eq('user_id', user?.id);

      if (subjectsError) {
        console.error('Error fetching user subjects:', subjectsError);
        throw subjectsError;
      }

      if (!userSubjects || userSubjects.length === 0) {
        setLoading(false);
        return;
      }

      // 2. For each subject, get all cards and build hierarchy
      const subjectsData: SubjectData[] = [];

      for (const userSubject of userSubjects) {
        const subjectName = userSubject.subject.subject_name;
        const subjectId = userSubject.subject_id;
        const examBoard = userSubject.exam_board || 'Unknown';
        
        // Get all cards for this subject
        const { data: cards, error: cardsError } = await supabase
          .from('flashcards')
          .select('topic_id')
          .eq('user_id', user?.id)
          .eq('subject_name', subjectName);

        if (cardsError) {
          console.error('Error fetching cards:', cardsError);
          continue;
        }

        // Get unique topic IDs that have cards
        const topicIdsWithCards = new Set(cards?.map(c => c.topic_id) || []);
        const totalCards = cards?.length || 0;

        // Get FULL curriculum for this subject (up to level 4)
        const { data: allTopics, error: topicsError } = await supabase
          .from('curriculum_topics')
          .select('id, topic_name, display_name, topic_level, parent_topic_id')
          .eq('exam_board_subject_id', subjectId)
          .lte('topic_level', 4)  // Only up to level 4
          .order('topic_level', { ascending: true });

        if (topicsError) {
          console.error('Error fetching topics:', topicsError);
          continue;
        }

        if (!allTopics || allTopics.length === 0) continue;

        // Get priorities for all topics
        const topicIds = allTopics.map(t => t.id);
        const { data: priorities } = await supabase
          .from('user_topic_priorities')
          .select('topic_id, priority')
          .eq('user_id', user?.id)
          .in('topic_id', topicIds);

        const priorityMap = new Map(priorities?.map(p => [p.topic_id, p.priority]) || []);

        // Build topic map
        const topicMap = new Map<string, TopicNode>();
        const topicsWithCardsSet = new Set(topicIdsWithCards);

        // First pass: Create all nodes
        allTopics.forEach(topic => {
          const hasCards = topicsWithCardsSet.has(topic.id);
          const cardCount = hasCards ? cards!.filter(c => c.topic_id === topic.id).length : 0;

          topicMap.set(topic.id, {
            id: topic.id,
            name: topic.display_name || topic.topic_name,
            level: topic.topic_level,
            hasCards,
            cardCount,
            children: [],
            parentId: topic.parent_topic_id,
            priority: priorityMap.get(topic.id) || null,
          });
        });

        // Second pass: Mark all ancestors of topics with cards as "hasCards"
        topicsWithCardsSet.forEach(topicId => {
          let currentId: string | null = topicId;
          while (currentId) {
            const node = topicMap.get(currentId);
            if (node) {
              node.hasCards = true;  // Mark ancestor as having cards
              currentId = node.parentId;
            } else {
              break;
            }
          }
        });

        // Third pass: Build tree structure
        const rootTopics: TopicNode[] = [];
        topicMap.forEach(node => {
          if (node.parentId === null) {
            // Root topic
            rootTopics.push(node);
          } else {
            // Child topic
            const parent = topicMap.get(node.parentId);
            if (parent) {
              parent.children.push(node);
            }
          }
        });

        // Sort children by name
        const sortChildren = (nodes: TopicNode[]) => {
          nodes.sort((a, b) => a.name.localeCompare(b.name));
          nodes.forEach(node => {
            if (node.children.length > 0) {
              sortChildren(node.children);
            }
          });
        };
        sortChildren(rootTopics);

        subjectsData.push({
          subjectName,
          subjectId,
          subjectColor: userSubject.color || '#6366F1',
          examBoard: examBoard,
          examType: 'A-Level',
          rootTopics,
          totalCards,
        });

        // Auto-expand first subject
        if (subjectsData.length === 1) {
          setExpandedSubjects(new Set([subjectName]));
        }
      }

      setSubjects(subjectsData);

    } catch (error) {
      console.error('Error loading curriculum:', error);
      Alert.alert('Error', 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newSet = new Set(expandedNodes);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    setExpandedNodes(newSet);
  };

  const toggleSubject = (subjectName: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(subjectName)) {
      newSet.delete(subjectName);
    } else {
      newSet.add(subjectName);
    }
    setExpandedSubjects(newSet);
  };

  const [showPriorityPicker, setShowPriorityPicker] = useState<{topicId: string, subject: SubjectData} | null>(null);

  const setPriority = async (topicId: string, priority: number | null, subject: SubjectData) => {
    try {
      if (priority === null) {
        // Delete the priority
        const { error } = await supabase
          .from('user_topic_priorities')
          .delete()
          .eq('user_id', user?.id)
          .eq('topic_id', topicId);

        if (error) throw error;
      } else {
        // Set/update the priority
        const { error } = await supabase
          .from('user_topic_priorities')
          .upsert({
            user_id: user?.id,
            topic_id: topicId,
            priority: priority,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Update local state
      const updateNodePriority = (nodes: TopicNode[]): TopicNode[] => {
        return nodes.map(node => {
          if (node.id === topicId) {
            return { ...node, priority };
          }
          if (node.children.length > 0) {
            return { ...node, children: updateNodePriority(node.children) };
          }
          return node;
        });
      };

      setSubjects(prevSubjects =>
        prevSubjects.map(s =>
          s.subjectName === subject.subjectName
            ? { ...s, rootTopics: updateNodePriority(s.rootTopics) }
            : s
        )
      );

      setShowPriorityPicker(null);
    } catch (error) {
      console.error('Error setting priority:', error);
      Alert.alert('Error', 'Failed to set priority');
    }
  };

  const handleAddCards = (node: TopicNode, subject: SubjectData) => {
    navigation.navigate('AIGenerator' as never, {
      topicId: node.id,
      topicName: node.name,
      subjectName: subject.subjectName,
      subjectColor: subject.subjectColor,
      examBoard: subject.examBoard,
      examType: subject.examType,
    } as never);
  };

  const renderTopicNode = (node: TopicNode, subject: SubjectData, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const priorityInfo = PRIORITY_LEVELS.find(p => p.value === node.priority);
    
    // Indentation based on depth (smaller for mobile)
    const indentSize = depth * 16;

    // Icon based on level (smaller for mobile)
    const getIcon = () => {
      if (node.level === 0) return '📄';
      if (node.level === 1) return '📂';
      if (node.level === 2) return '📁';
      return '📌';
    };

    return (
      <View key={node.id} style={styles.topicNodeContainer}>
        <View 
          style={[
            styles.topicRow, 
            { marginLeft: indentSize },
            node.hasCards && styles.topicRowWithCards,
          ]}
        >
          {/* Left side - Expand/Icon/Name */}
          <TouchableOpacity
            style={styles.topicLeft}
            onPress={() => hasChildren && toggleNode(node.id)}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              <Text style={[styles.chevron, node.hasCards && styles.chevronBright]}>{isExpanded ? '▾' : '›'}</Text>
            ) : (
              <View style={styles.chevronSpacer} />
            )}
            <Text style={styles.topicIcon}>{getIcon()}</Text>
            <View style={styles.topicInfo}>
              <Text
                style={[
                  styles.topicName,
                  node.level === 0 && styles.topicNameL0,
                  node.level === 1 && styles.topicNameL1,
                  node.hasCards && styles.topicNameWithCards,
                ]}
                numberOfLines={2}
              >
                {node.name}
              </Text>
              {node.level === 0 && (
                <View style={[styles.levelBadge, node.hasCards && styles.levelBadgeActive]}>
                  <Text style={styles.levelBadgeText}>Paper</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Right side - Priority/Cards/Actions */}
          <View style={styles.topicRight}>
            {/* Priority picker button */}
            <TouchableOpacity
              style={[
                styles.priorityPickerButton,
                priorityInfo && { backgroundColor: priorityInfo.color, borderColor: priorityInfo.color }
              ]}
              onPress={() => setShowPriorityPicker({ topicId: node.id, subject })}
            >
              <Text style={[styles.priorityNumber, priorityInfo && styles.priorityNumberActive]}>
                {priorityInfo?.number || '○'}
              </Text>
            </TouchableOpacity>

            {/* Card count or Add button */}
            {node.cardCount > 0 ? (
              <TouchableOpacity
                style={[styles.cardBadge, { backgroundColor: subject.subjectColor }]}
                onPress={() => {
                  navigation.navigate('ManageTopic' as never, {
                    topicId: node.id,
                    topicName: node.name,
                    subjectName: subject.subjectName,
                    subjectColor: subject.subjectColor,
                    examBoard: subject.examBoard,
                    examType: subject.examType,
                  } as never);
                }}
              >
                <Text style={styles.cardBadgeText}>{node.cardCount}</Text>
                <Icon name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddCards(node, subject)}
              >
                <Icon name="add-circle" size={20} color={subject.subjectColor} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Render ALL children when expanded (not just ones with cards) */}
        {isExpanded && hasChildren && (
          <View>
            {node.children.map(child => renderTopicNode(child, subject, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading curriculum...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subjects.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage All Cards</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No cards found</Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Create some flashcards to get started!
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CardSubjectSelector' as never)}
          >
            <Icon name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Cards</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage All Cards</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Full Curriculum Overview
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Priority Picker Modal */}
        {showPriorityPicker && (
          <Modal transparent visible={true} animationType="fade" onRequestClose={() => setShowPriorityPicker(null)}>
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowPriorityPicker(null)}
            >
              <View style={styles.priorityModal}>
                <Text style={[styles.priorityModalTitle, { color: colors.text }]}>Set Priority</Text>
                <View style={styles.priorityOptions}>
                  {PRIORITY_LEVELS.map(level => (
                  <TouchableOpacity
                    key={level.value}
                    style={[styles.priorityOption, { backgroundColor: level.color }]}
                    onPress={() => setPriority(showPriorityPicker.topicId, level.value, showPriorityPicker.subject)}
                  >
                    <View style={styles.priorityNumberCircle}>
                      <Text style={styles.priorityOptionNumber}>{level.number}</Text>
                    </View>
                    <Text style={styles.priorityOptionText}>{level.label}</Text>
                  </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.priorityOptionClear}
                    onPress={() => setPriority(showPriorityPicker.topicId, null, showPriorityPicker.subject)}
                  >
                    <Text style={styles.priorityOptionClearText}>Clear Priority</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        {/* Info Banner */}
        <View style={[styles.infoBanner, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: colors.primary }]}>
          <Icon name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoBannerText, { color: colors.text }]}>
            Set priorities on any topic to plan your study. Topics with cards are highlighted.
          </Text>
        </View>

        {/* Subjects */}
        {subjects.map((subject, index) => {
          const isExpanded = expandedSubjects.has(subject.subjectName);
          
          return (
            <View key={index} style={styles.subjectSection}>
              {/* Subject Header */}
              <TouchableOpacity onPress={() => toggleSubject(subject.subjectName)}>
                <LinearGradient
                  colors={[subject.subjectColor, adjustColor(subject.subjectColor, -20)]}
                  style={styles.subjectHeader}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.subjectHeaderLeft}>
                    <Text style={styles.chevronLarge}>{isExpanded ? '▾' : '›'}</Text>
                    <View>
                      <Text style={styles.subjectName}>{subject.subjectName}</Text>
                      <Text style={styles.subjectMeta}>{subject.examBoard}</Text>
                    </View>
                  </View>
                  <View style={styles.subjectBadge}>
                    <Text style={styles.subjectBadgeText}>{subject.totalCards} cards</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Topic Tree */}
              {isExpanded && (
                <View style={[styles.topicTree, { backgroundColor: colors.surface }]}>
                  {subject.rootTopics.map(rootTopic => 
                    renderTopicNode(rootTopic, subject, 0)
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('HomeMain' as never)}
          >
            <Icon name="home" size={20} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to adjust color brightness
const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 245, 255, 0.2)',
  },
  backButton: {
    marginRight: 12,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  subjectSection: {
    marginBottom: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
  },
  subjectHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  chevronLarge: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subjectMeta: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  subjectBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subjectBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  topicTree: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  topicNodeContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  topicRowWithCards: Platform.select({
    web: {
      // Web: Use borders for glow effect
      backgroundColor: 'rgba(0, 212, 255, 0.08)',
      borderLeftWidth: 4,
      borderLeftColor: '#00D4FF',
      borderRightWidth: 1,
      borderRightColor: 'rgba(0, 212, 255, 0.3)',
      borderTopWidth: 1,
      borderTopColor: 'rgba(0, 212, 255, 0.2)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0, 212, 255, 0.2)',
    },
    default: {
      // Mobile: Use shadows for proper glow
      backgroundColor: 'rgba(0, 245, 255, 0.05)',
      borderLeftWidth: 3,
      borderLeftColor: '#00D4FF',
      shadowColor: '#00D4FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 4,
    }
  }),
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  chevron: {
    fontSize: 16,
    marginRight: 6,
    width: 16,
    color: '#666',
    fontWeight: '700',
  },
  chevronBright: {
    color: '#00D4FF',
  },
  chevronSpacer: {
    width: 22,
  },
  topicIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  topicNameWithCards: {
    color: '#111827',
    fontWeight: '700',
  },
  topicNameL0: {
    fontSize: 15,
  },
  topicNameL1: {
    fontSize: 14,
  },
  levelBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  levelBadgeActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  levelBadgeText: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '600',
  },
  topicRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityPickerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  priorityNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  priorityNumberActive: {
    color: '#FFFFFF',
  },
  priorityNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityOptionNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 3,
    minWidth: 44,
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      }
    }),
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityModal: {
    backgroundColor: '#1E1E2E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  priorityModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  priorityOptions: {
    gap: 12,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  priorityOptionEmoji: {
    fontSize: 24,
  },
  priorityOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  priorityOptionClear: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  priorityOptionClearText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
