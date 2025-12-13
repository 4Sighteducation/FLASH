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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { LinearGradient } from 'expo-linear-gradient';

interface TopicNode {
  id: string;
  name: string;
  level: number;
  hasCards: boolean;
  cardCount: number;
  children: TopicNode[];
  parentId: string | null;
}

interface SubjectData {
  subjectName: string;
  subjectColor: string;
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
          subject:exam_board_subjects!subject_id(
            subject_name,
            exam_board,
            qualification_type
          )
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;

      if (!userSubjects || userSubjects.length === 0) {
        setLoading(false);
        return;
      }

      // 2. For each subject, get all cards and build hierarchy
      const subjectsData: SubjectData[] = [];

      for (const userSubject of userSubjects) {
        const subjectName = userSubject.subject.subject_name;
        
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
          .select('id, topic_name, display_name, topic_level, parent_topic_id, subject_name')
          .eq('subject_name', subjectName)
          .lte('topic_level', 4)  // Only up to level 4
          .order('topic_level', { ascending: true });

        if (topicsError) {
          console.error('Error fetching topics:', topicsError);
          continue;
        }

        if (!allTopics || allTopics.length === 0) continue;

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
          subjectColor: userSubject.color || '#6366F1',
          examBoard: userSubject.subject.exam_board,
          examType: userSubject.subject.qualification_type,
          rootTopics,
          totalCards,
        });
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

  const renderTopicNode = (node: TopicNode, subject: SubjectData, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    
    // Filter children: only show un-greyed children when expanded
    const visibleChildren = node.children.filter(child => child.hasCards);

    // Indentation based on depth
    const indentSize = depth * 20;

    // Icon based on level
    const getIcon = () => {
      if (node.level === 0) return '📄';  // Paper
      if (node.level === 1) return '📂';  // Section
      if (node.level === 2) return '📁';  // Subsection
      if (node.level === 3) return '📋';  // Topic
      return '📌';  // Subtopic
    };

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[
            styles.topicRow,
            { marginLeft: indentSize },
            !node.hasCards && styles.topicRowGreyed,
          ]}
          onPress={() => {
            if (hasChildren && visibleChildren.length > 0) {
              toggleNode(node.id);
            } else if (node.cardCount > 0) {
              // Navigate to ManageTopicScreen
              navigation.navigate('ManageTopic' as never, {
                topicId: node.id,
                topicName: node.name,
                subjectName: subject.subjectName,
                subjectColor: subject.subjectColor,
                examBoard: subject.examBoard,
                examType: subject.examType,
              } as never);
            }
          }}
          disabled={!node.hasCards}
        >
          <View style={styles.topicLeft}>
            {hasChildren && visibleChildren.length > 0 && (
              <Text style={styles.chevron}>
                {isExpanded ? '▾' : '›'}
              </Text>
            )}
            <Text style={styles.topicIcon}>{getIcon()}</Text>
            <Text style={[
              styles.topicName,
              !node.hasCards && styles.topicNameGreyed,
              node.level === 0 && styles.topicNameL0,
              node.level === 1 && styles.topicNameL1,
            ]}>
              {node.name}
            </Text>
          </View>
          {node.cardCount > 0 && (
            <View style={[styles.cardBadge, { backgroundColor: subject.subjectColor }]}>
              <Text style={styles.cardBadgeText}>{node.cardCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Render children only if expanded */}
        {isExpanded && visibleChildren.map(child => 
          renderTopicNode(child, subject, depth + 1)
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Cards</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No cards found. Create some flashcards to get started!
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('CardSubjectSelector' as never)}
          >
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manage All Cards</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {subjects.map((subject, index) => (
          <View key={index} style={styles.subjectSection}>
            {/* Subject Header */}
            <LinearGradient
              colors={[subject.subjectColor, adjustColor(subject.subjectColor, -20)]}
              style={styles.subjectHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.subjectName}>{subject.subjectName}</Text>
              <View style={styles.subjectBadge}>
                <Text style={styles.subjectBadgeText}>{subject.totalCards} cards</Text>
              </View>
            </LinearGradient>

            {/* Topic Tree */}
            <View style={[styles.topicTree, { backgroundColor: colors.surface }]}>
              {subject.rootTopics.map(rootTopic => 
                renderTopicNode(rootTopic, subject, 0)
              )}
            </View>
          </View>
        ))}

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Return home to generate more cards
          </Text>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('HomeMain' as never)}
          >
            <Icon name="home" size={20} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>Go Home</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.2)',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  subjectSection: {
    marginBottom: 24,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subjectBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subjectBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  topicTree: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  topicRowGreyed: {
    opacity: 0.4,
  },
  topicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chevron: {
    fontSize: 16,
    marginRight: 8,
    width: 16,
    color: '#666',
  },
  topicIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  topicName: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  topicNameGreyed: {
    color: '#9CA3AF',
  },
  topicNameL0: {
    fontWeight: '700',
    fontSize: 16,
  },
  topicNameL1: {
    fontWeight: '600',
  },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  cardBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
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
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
