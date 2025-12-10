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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import FlashcardCard from '../../components/FlashcardCard';
import { abbreviateTopicName } from '../../utils/topicNameUtils';

// Priority levels
const PRIORITY_LEVELS = [
  { value: 1, label: "I've Got This", emoji: '😎', color: '#10B981' },
  { value: 2, label: 'Worth a Look', emoji: '👀', color: '#3B82F6' },
  { value: 3, label: 'Revision Mode', emoji: '📚', color: '#F59E0B' },
  { value: 4, label: 'Exam Alert', emoji: '🚨', color: '#EF4444' },
];

interface CardWithTopic {
  id: string;
  question: string;
  answer: string;
  card_type: string;
  box_number: number;
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
  topic_id: string;
  topic_name: string;
  subject_name: string;
  subject_color: string;
  topic_level: number;
  parent_name?: string;
  grandparent_name?: string;
  great_grandparent_name?: string;
  priority?: number;
}

interface HierarchyNode {
  subject?: string;
  level0?: string;  // Paper
  level1?: string;  // Section
  level2?: string;  // Subsection
  topicId?: string;
  topicName?: string;
  cards: CardWithTopic[];
  children?: HierarchyNode[];
}

export default function ManageAllCardsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors, theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [allCards, setAllCards] = useState<CardWithTopic[]>([]);
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedL0, setExpandedL0] = useState<Set<string>>(new Set());
  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [cardsDueTotal, setCardsDueTotal] = useState(0);

  useEffect(() => {
    loadAllCards();
  }, []);

  const loadAllCards = async () => {
    try {
      setLoading(true);

      // Fetch all cards
      const { data: flashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching flashcards:', error);
        throw error;
      }

      console.log('📚 Fetched', flashcards?.length || 0, 'cards');

      if (flashcards && flashcards.length > 0) {
        // Get all unique topic IDs
        const topicIds = [...new Set(flashcards.map(f => f.topic_id))];
        console.log('🎯 Unique topic IDs:', topicIds.length);
        
        // Fetch topic details with hierarchy (using direct query instead of RPC)
        const { data: topicDetails, error: topicError } = await supabase
          .from('curriculum_topics')
          .select(`
            id,
            topic_name,
            display_name,
            topic_level,
            parent_topic_id,
            parent:curriculum_topics!parent_topic_id(
              topic_name,
              display_name,
              parent_topic_id,
              parent:curriculum_topics!parent_topic_id(
                topic_name,
                display_name,
                parent_topic_id,
                parent:curriculum_topics!parent_topic_id(
                  topic_name,
                  display_name
                )
              )
            )
          `)
          .in('id', topicIds);

        if (topicError) {
          console.error('Error fetching topics:', topicError);
        }

        console.log('📋 Fetched topic details for', topicDetails?.length || 0, 'topics');

        // Fetch priorities
        const { data: priorities } = await supabase
          .from('user_topic_priorities')
          .select('topic_id, priority')
          .eq('user_id', user?.id);

        const priorityMap = new Map(priorities?.map(p => [p.topic_id, p.priority]) || []);

        // Get user subjects for colors
        const { data: userSubjects } = await supabase
          .from('user_subjects')
          .select('subject:exam_board_subjects!subject_id(subject_name), color')
          .eq('user_id', user?.id);

        const subjectColorMap = new Map(
          userSubjects?.map(us => [us.subject?.subject_name, us.color]) || []
        );

        // Build hierarchy info map from topicDetails
        const topicHierarchyMap = new Map();
        topicDetails?.forEach(topic => {
          topicHierarchyMap.set(topic.id, {
            topic_id: topic.id,
            topic_name: topic.display_name || topic.topic_name,
            topic_level: topic.topic_level,
            parent_name: topic.parent?.display_name || topic.parent?.topic_name,
            grandparent_name: topic.parent?.parent?.display_name || topic.parent?.parent?.topic_name,
            great_grandparent_name: topic.parent?.parent?.parent?.display_name || topic.parent?.parent?.parent?.topic_name,
          });
        });

        // Enrich cards with hierarchy and priority info
        const enrichedCards: CardWithTopic[] = flashcards.map(card => {
          const topicInfo = topicHierarchyMap.get(card.topic_id);
          
          return {
            id: card.id,
            question: card.question,
            answer: card.answer,
            card_type: card.card_type,
            box_number: card.box_number,
            options: card.options,
            correct_answer: card.correct_answer,
            key_points: card.key_points,
            detailed_answer: card.detailed_answer,
            topic_id: card.topic_id,
            subject_name: card.subject_name,
            topic_name: topicInfo?.topic_name || 'Unknown Topic',
            topic_level: topicInfo?.topic_level || 3,
            parent_name: topicInfo?.parent_name,
            grandparent_name: topicInfo?.grandparent_name,
            great_grandparent_name: topicInfo?.great_grandparent_name,
            subject_color: subjectColorMap.get(card.subject_name) || '#6366F1',
            priority: priorityMap.get(card.topic_id),
          };
        });

        console.log('✅ Enriched', enrichedCards.length, 'cards');
        console.log('📊 Sample card:', enrichedCards[0]);

        setAllCards(enrichedCards);

        // Calculate cards due (Box 1)
        const dueCount = enrichedCards.filter(c => c.box_number === 1).length;
        setCardsDueTotal(dueCount);

        // Build hierarchy
        const hierarchyTree = buildHierarchy(enrichedCards);
        setHierarchy(hierarchyTree);

        // Auto-expand first subject
        if (hierarchyTree.length > 0 && hierarchyTree[0].subject) {
          setExpandedSubjects(new Set([hierarchyTree[0].subject]));
        }
      }

    } catch (error) {
      console.error('Error loading cards:', error);
      Alert.alert('Error', 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (cards: CardWithTopic[]): HierarchyNode[] => {
    const subjectMap = new Map<string, HierarchyNode>();

    cards.forEach(card => {
      const subject = card.subject_name;
      const level0 = card.great_grandparent_name || card.grandparent_name || card.parent_name || 'Other';
      const level1 = card.great_grandparent_name ? card.grandparent_name : (card.grandparent_name ? card.parent_name : null);
      const level2 = card.great_grandparent_name && card.grandparent_name ? card.parent_name : null;
      const topicName = card.topic_name;
      const topicId = card.topic_id;

      // Build hierarchy key
      const key = `${subject}||${level0}||${level1 || ''}||${level2 || ''}||${topicId}`;

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, {
          subject,
          cards: [],
          children: [],
        });
      }

      const subjectNode = subjectMap.get(subject)!;
      
      // Find or create L0 node
      let l0Node = subjectNode.children?.find(n => n.level0 === level0);
      if (!l0Node) {
        l0Node = { level0, cards: [], children: [] };
        subjectNode.children?.push(l0Node);
      }

      if (level1) {
        // Find or create L1 node
        let l1Node = l0Node.children?.find(n => n.level1 === level1);
        if (!l1Node) {
          l1Node = { level1, cards: [], children: [] };
          l0Node.children?.push(l1Node);
        }

        if (level2) {
          // Find or create L2 node
          let l2Node = l1Node.children?.find(n => n.level2 === level2);
          if (!l2Node) {
            l2Node = { level2, cards: [], children: [] };
            l1Node.children?.push(l2Node);
          }

          // Find or create topic node
          let topicNode = l2Node.children?.find(n => n.topicId === topicId);
          if (!topicNode) {
            topicNode = { topicId, topicName, cards: [] };
            l2Node.children?.push(topicNode);
          }
          topicNode.cards.push(card);
        } else {
          // Topic directly under L1
          let topicNode = l1Node.children?.find(n => n.topicId === topicId);
          if (!topicNode) {
            topicNode = { topicId, topicName, cards: [] };
            l1Node.children?.push(topicNode);
          }
          topicNode.cards.push(card);
        }
      } else {
        // Topic directly under L0
        let topicNode = l0Node.children?.find(n => n.topicId === topicId);
        if (!topicNode) {
          topicNode = { topicId, topicName, cards: [] };
          l0Node.children?.push(topicNode);
        }
        topicNode.cards.push(card);
      }
    });

    return Array.from(subjectMap.values());
  };

  const toggleSubject = (subject: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(subject)) {
      newSet.delete(subject);
    } else {
      newSet.add(subject);
    }
    setExpandedSubjects(newSet);
  };

  const toggleL0 = (key: string) => {
    const newSet = new Set(expandedL0);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedL0(newSet);
  };

  const toggleL1 = (key: string) => {
    const newSet = new Set(expandedL1);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedL1(newSet);
  };

  const toggleL2 = (key: string) => {
    const newSet = new Set(expandedL2);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedL2(newSet);
  };

  const toggleTopic = (topicId: string) => {
    const newSet = new Set(expandedTopics);
    if (newSet.has(topicId)) {
      newSet.delete(topicId);
    } else {
      newSet.add(topicId);
    }
    setExpandedTopics(newSet);
  };

  const toggleCard = (cardId: string) => {
    const newSet = new Set(expandedCards);
    if (newSet.has(cardId)) {
      newSet.delete(cardId);
    } else {
      newSet.add(cardId);
    }
    setExpandedCards(newSet);
  };

  const handleDeleteCard = async (cardId: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('flashcards')
                .delete()
                .eq('id', cardId);

              if (error) throw error;

              // Reload cards
              loadAllCards();
              Alert.alert('Success', 'Card deleted');
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete card');
            }
          },
        },
      ]
    );
  };

  const renderCard = (card: CardWithTopic, index: number) => {
    const isExpanded = expandedCards.has(card.id);
    
    return (
      <View key={card.id} style={[styles.cardAccordion, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.cardAccordionHeader}
          onPress={() => toggleCard(card.id)}
        >
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.cardNumber, { backgroundColor: card.subject_color + '20' }]}>
              <Text style={[styles.cardNumberText, { color: card.subject_color }]}>#{index + 1}</Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={isExpanded ? 0 : 2}>
                {card.question}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                  {card.card_type === 'multiple_choice' ? 'MC' : 
                   card.card_type === 'short_answer' ? 'SA' : 
                   card.card_type === 'essay' ? 'ES' :
                   card.card_type === 'acronym' ? 'AC' : card.card_type}
                </Text>
                <Text style={[styles.cardMetaDivider, { color: colors.textSecondary }]}>•</Text>
                <Text style={[styles.cardBox, { color: colors.textSecondary }]}>
                  Box {card.box_number}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <TouchableOpacity
              style={styles.deleteButtonCompact}
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteCard(card.id);
              }}
            >
              <Icon name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardAccordionContent}>
            <View style={styles.expandedCardContainer}>
              <FlashcardCard
                card={{
                  ...card,
                  topic: card.topic_name,
                }}
                color={card.subject_color}
                showDeleteButton={false}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTopic = (node: HierarchyNode, parentKey: string) => {
    if (!node.topicId || !node.topicName) return null;
    
    const key = `${parentKey}||${node.topicId}`;
    const isExpanded = expandedTopics.has(key);
    const cardsDueInTopic = node.cards.filter(c => c.box_number === 1).length;

    return (
      <View key={key} style={styles.topicNode}>
        <TouchableOpacity
          style={[styles.topicHeader, { backgroundColor: colors.surface }]}
          onPress={() => toggleTopic(key)}
        >
          <View style={styles.topicHeaderLeft}>
            <View style={[styles.levelIndicator, { backgroundColor: node.cards[0]?.subject_color || '#6366F1' }]}>
              <Text style={styles.levelText}>L{node.cards[0]?.topic_level || 3}</Text>
            </View>
            <Text style={[styles.topicName, { color: colors.text }]}>
              {abbreviateTopicName(node.topicName)}
            </Text>
            {cardsDueInTopic > 0 && (
              <View style={styles.dueIndicator}>
                <Text style={styles.dueIndicatorText}>{cardsDueInTopic}</Text>
              </View>
            )}
          </View>
          <View style={styles.topicHeaderRight}>
            <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
              {node.cards.length} cards
            </Text>
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={colors.textSecondary} 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardsContainer}>
            {node.cards.map((card, idx) => renderCard(card, idx))}
          </View>
        )}
      </View>
    );
  };

  const renderL2 = (node: HierarchyNode, parentKey: string) => {
    if (!node.level2) return null;
    
    const key = `${parentKey}||${node.level2}`;
    const isExpanded = expandedL2.has(key);
    const cardCount = countCards(node);

    return (
      <View key={key} style={styles.level2Node}>
        <TouchableOpacity
          style={[styles.level2Header, { backgroundColor: colors.surface }]}
          onPress={() => toggleL2(key)}
        >
          <Icon name="list" size={18} color={colors.text} />
          <Text style={[styles.level2Title, { color: colors.text }]}>
            {abbreviateTopicName(node.level2)}
          </Text>
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
            {cardCount}
          </Text>
          <Icon 
            name={isExpanded ? "remove" : "add"} 
            size={16} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.level2Content}>
            {node.children?.map(child => renderTopic(child, key))}
          </View>
        )}
      </View>
    );
  };

  const renderL1 = (node: HierarchyNode, parentKey: string) => {
    if (!node.level1) return null;
    
    const key = `${parentKey}||${node.level1}`;
    const isExpanded = expandedL1.has(key);
    const cardCount = countCards(node);

    return (
      <View key={key} style={styles.level1Node}>
        <TouchableOpacity
          style={[styles.level1Header, { backgroundColor: colors.surface }]}
          onPress={() => toggleL1(key)}
        >
          <Icon name={isExpanded ? "folder-open" : "folder"} size={20} color={colors.text} />
          <Text style={[styles.level1Title, { color: colors.text }]}>
            {abbreviateTopicName(node.level1)}
          </Text>
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
            {cardCount}
          </Text>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={18} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.level1Content}>
            {node.children?.map(child => 
              child.level2 ? renderL2(child, key) : renderTopic(child, key)
            )}
          </View>
        )}
      </View>
    );
  };

  const renderL0 = (node: HierarchyNode, parentKey: string) => {
    if (!node.level0) return null;
    
    const key = `${parentKey}||${node.level0}`;
    const isExpanded = expandedL0.has(key);
    const cardCount = countCards(node);
    const firstCard = node.cards[0] || (node.children?.[0]?.cards?.[0]);

    return (
      <View key={key} style={styles.level0Node}>
        <TouchableOpacity
          style={[styles.level0Header, { 
            backgroundColor: colors.surface,
            borderLeftColor: firstCard?.subject_color || '#6366F1'
          }]}
          onPress={() => toggleL0(key)}
        >
          <Icon name="document-text" size={22} color={firstCard?.subject_color || '#6366F1'} />
          <Text style={[styles.level0Title, { color: colors.text }]}>
            {abbreviateTopicName(node.level0)}
          </Text>
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
            {cardCount}
          </Text>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.level0Content}>
            {node.children?.map(child => renderL1(child, key))}
          </View>
        )}
      </View>
    );
  };

  const renderSubject = (node: HierarchyNode) => {
    if (!node.subject) return null;
    
    const isExpanded = expandedSubjects.has(node.subject);
    const cardCount = countCards(node);
    const firstCard = node.cards[0] || (node.children?.[0]?.cards?.[0]);

    return (
      <View key={node.subject} style={styles.subjectNode}>
        <TouchableOpacity
          style={[styles.subjectHeader, { 
            backgroundColor: firstCard?.subject_color || '#6366F1',
          }]}
          onPress={() => toggleSubject(node.subject!)}
        >
          <Text style={styles.subjectTitle}>{node.subject}</Text>
          <View style={styles.subjectRight}>
            <View style={styles.cardCountBadge}>
              <Text style={styles.cardCountText}>{cardCount}</Text>
            </View>
            <Icon 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={24} 
              color="#fff" 
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.subjectContent}>
            {node.children?.map(child => renderL0(child, node.subject!))}
          </View>
        )}
      </View>
    );
  };

  const countCards = (node: HierarchyNode): number => {
    let count = node.cards.length;
    if (node.children) {
      count += node.children.reduce((sum, child) => sum + countCards(child), 0);
    }
    return count;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage All Cards</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {allCards.length} cards across all subjects
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Daily Study Button - All Topics */}
        {allCards.length > 0 && (
          <View style={styles.topSection}>
            <TouchableOpacity
              style={[
                styles.dailyStudyButton,
                { backgroundColor: cardsDueTotal > 0 ? '#6366F1' : colors.border },
              ]}
              onPress={() => {
                if (cardsDueTotal > 0) {
                  navigation.navigate('Study', { openDailyCards: true });
                }
              }}
              disabled={cardsDueTotal === 0}
            >
              <View style={styles.dailyStudyContent}>
                <Icon name="play-circle" size={28} color="#fff" />
                <Text style={styles.dailyStudyText}>
                  {cardsDueTotal > 0 ? 'Complete Daily Study' : 'All done for today'}
                </Text>
                {cardsDueTotal > 0 && (
                  <View style={styles.notificationDot}>
                    <View style={styles.notificationPulse} />
                    <Text style={styles.notificationText}>{cardsDueTotal}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Hierarchy Tree */}
        {allCards.length > 0 ? (
          <View style={styles.hierarchyContainer}>
            {hierarchy.map(subjectNode => renderSubject(subjectNode))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="albums-outline" size={64} color="#ccc" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cards Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first flashcards to get started!
            </Text>
          </View>
        )}

        {/* Return Home Button */}
        <TouchableOpacity
          style={styles.returnHomeButton}
          onPress={() => navigation.navigate('HomeMain' as never)}
        >
          <Icon name="add-circle" size={24} color="#6366F1" />
          <Text style={styles.returnHomeText}>Return home to generate new cards</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topSection: {
    margin: 16,
    marginBottom: 12,
  },
  dailyStudyButton: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dailyStudyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dailyStudyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  notificationDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  notificationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    opacity: 0.3,
  },
  notificationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hierarchyContainer: {
    marginHorizontal: 16,
  },
  subjectNode: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  subjectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardCountText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectContent: {
    padding: 12,
  },
  level0Node: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  level0Header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderLeftWidth: 4,
  },
  level0Title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  level0Content: {
    paddingLeft: 12,
  },
  level1Node: {
    marginBottom: 6,
  },
  level1Header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0, 212, 255, 0.3)',
  },
  level1Title: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  level1Content: {
    paddingLeft: 16,
  },
  level2Node: {
    marginBottom: 4,
  },
  level2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 212, 255, 0.2)',
  },
  level2Title: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  level2Content: {
    paddingLeft: 12,
  },
  topicNode: {
    marginBottom: 8,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  topicHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topicHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  topicName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  cardCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  dueIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueIndicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardsContainer: {
    paddingLeft: 12,
    paddingTop: 8,
  },
  cardAccordion: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  cardAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  cardType: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMetaDivider: {
    fontSize: 11,
  },
  cardBox: {
    fontSize: 11,
  },
  deleteButtonCompact: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  cardQuestion: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardAccordionContent: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
  },
  expandedCardContainer: {
    height: 350,
    maxHeight: 350,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  returnHomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    gap: 8,
  },
  returnHomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366F1',
  },
});

