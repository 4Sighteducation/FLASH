import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import Icon from '../../components/Icon';
import { abbreviateTopicName } from '../../utils/topicNameUtils';
import FlashcardCard from '../../components/FlashcardCard';

// Priority levels - using "Revision Urgency" set
const PRIORITY_LEVELS = [
  { value: 1, label: "I've Got This", emoji: '😎', color: '#10B981', description: 'Light review only' },
  { value: 2, label: 'Worth a Look', emoji: '👀', color: '#3B82F6', description: 'Needs a refresh' },
  { value: 3, label: 'Revision Mode', emoji: '📚', color: '#F59E0B', description: 'Proper work needed' },
  { value: 4, label: 'Exam Alert', emoji: '🚨', color: '#EF4444', description: 'Priority #1!' },
];

interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  card_type: string;
  box_number: number;
  created_at: string;
  in_study_bank: boolean;
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
}

export default function ManageTopicScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  
  const { topicId, topicName, subjectName, subjectColor, examBoard, examType } = route.params as any;

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTopicData();
  }, []);

  const loadTopicData = async () => {
    try {
      setLoading(true);

      // Fetch all cards for this topic with all fields needed for rendering
      const { data: flashcards, error: cardsError } = await supabase
        .from('flashcards')
        .select('id, question, answer, card_type, box_number, created_at, in_study_bank, options, correct_answer, key_points, detailed_answer')
        .eq('topic_id', topicId)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;
      setCards(flashcards || []);

      // Fetch current priority
      const { data: priorityData, error: priorityError } = await supabase
        .from('user_topic_priorities')
        .select('priority')
        .eq('user_id', user?.id)
        .eq('topic_id', topicId)
        .single();

      if (!priorityError && priorityData) {
        setPriority(priorityData.priority);
      }

    } catch (error) {
      console.error('Error loading topic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handlePriorityChange = async (newPriority: number) => {
    try {
      if (priority === newPriority) {
        // Remove priority
        await supabase
          .from('user_topic_priorities')
          .delete()
          .eq('user_id', user?.id)
          .eq('topic_id', topicId);
        setPriority(null);
      } else {
        // Set priority
        await supabase
          .from('user_topic_priorities')
          .upsert({
            user_id: user?.id,
            topic_id: topicId,
            priority: newPriority,
            updated_at: new Date().toISOString(),
          });
        setPriority(newPriority);
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      Alert.alert('Error', 'Failed to update priority');
    }
  };

  const handleAddMoreCards = (cardType: string) => {
    navigation.navigate('AIGenerator', {
      topicId,
      topic: topicName,
      subject: subjectName,
      examBoard,
      examType,
      existingCardType: cardType,
    });
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
              loadTopicData();
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

  const handleRegenerateCards = () => {
    Alert.alert(
      'Regenerate All Cards',
      'This will delete all existing cards and generate new ones. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all cards for this topic
              await supabase
                .from('flashcards')
                .delete()
                .eq('topic_id', topicId)
                .eq('user_id', user?.id);

              // Navigate to AI Generator
              navigation.navigate('AIGenerator', {
                topicId,
                topic: topicName,
                subject: subjectName,
                examBoard,
                examType,
              });
            } catch (error) {
              console.error('Error regenerating:', error);
              Alert.alert('Error', 'Failed to regenerate cards');
            }
          },
        },
      ]
    );
  };

  const priorityInfo = priority ? PRIORITY_LEVELS.find(p => p.value === priority) : null;
  const cardsByType = cards.reduce((acc, card) => {
    acc[card.card_type] = (acc[card.card_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manage Topic</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {abbreviateTopicName(topicName)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Study Options */}
        {cards.length > 0 && (
          <View style={styles.studyOptions}>
            <TouchableOpacity
              style={[styles.studyButton, { backgroundColor: subjectColor || '#6366F1' }]}
              onPress={() => navigation.navigate('StudyModal', {
                topicName,
                subjectName,
                subjectColor,
                topicId,
              })}
            >
              <Icon name="play-circle" size={24} color="#fff" />
              <Text style={styles.studyButtonText}>Study (Leitner)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Compact Info Bar */}
        <View style={[styles.infoBar, { backgroundColor: colors.surface }]}>
          {/* Priority Selector - Compact */}
          <View style={styles.infoSection}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.priorityScroll}>
              {PRIORITY_LEVELS.map(level => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.priorityChip,
                    { borderColor: level.color },
                    priority === level.value && { backgroundColor: level.color },
                  ]}
                  onPress={() => handlePriorityChange(level.value)}
                >
                  <Text style={styles.priorityChipEmoji}>{level.emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Card Stats - Compact */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={[styles.statNumber, { color: subjectColor }]}>{cards.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            {Object.entries(cardsByType).slice(0, 3).map(([type, count]) => (
              <View key={type} style={styles.statChip}>
                <Text style={[styles.statNumber, { color: subjectColor }]}>{count}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {type === 'multiple_choice' ? 'MC' : 
                   type === 'short_answer' ? 'SA' :
                   type === 'essay' ? 'Essay' : type.slice(0, 3).toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Add More Cards - Compact */}
        <View style={[styles.addCardsBar, { backgroundColor: colors.surface }]}>
          <Text style={[styles.addCardsLabel, { color: colors.text }]}>➕ Add Cards</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addCardsScroll}>
            <TouchableOpacity
              style={[styles.addCardChip, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('multiple_choice')}
            >
              <Text style={[styles.addCardChipText, { color: subjectColor }]}>MC</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardChip, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('short_answer')}
            >
              <Text style={[styles.addCardChipText, { color: subjectColor }]}>SA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardChip, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('essay')}
            >
              <Text style={[styles.addCardChipText, { color: subjectColor }]}>Essay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardChip, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('acronym')}
            >
              <Text style={[styles.addCardChipText, { color: subjectColor }]}>Acronym</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Card Accordion List */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 All Cards ({cards.length})</Text>
          
          {cards.map((card, index) => {
            const isExpanded = expandedCards.has(card.id);
            
            return (
              <View key={card.id} style={[styles.cardAccordion, { borderColor: colors.border }]}>
                {/* Collapsed Header - Always Visible */}
                <TouchableOpacity
                  style={styles.cardAccordionHeader}
                  onPress={() => toggleCardExpansion(card.id)}
                >
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardNumber, { backgroundColor: subjectColor + '20' }]}>
                      <Text style={[styles.cardNumberText, { color: subjectColor }]}>#{index + 1}</Text>
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={isExpanded ? 0 : 2}>
                        {card.question}
                      </Text>
                      <View style={styles.cardMeta}>
                        <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                          {card.card_type === 'multiple_choice' ? 'Multiple Choice' : 
                           card.card_type === 'short_answer' ? 'Short Answer' : 
                           card.card_type === 'essay' ? 'Essay' :
                           card.card_type === 'acronym' ? 'Acronym' : card.card_type}
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

                {/* Expanded Card View */}
                {isExpanded && (
                  <View style={styles.cardAccordionContent}>
                    <View style={styles.expandedCardContainer}>
                      <FlashcardCard
                        card={{
                          ...card,
                          topic: topicName,
                        }}
                        color={subjectColor || '#6366F1'}
                        showDeleteButton={false}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Danger Zone */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>⚠️ Danger Zone</Text>
          
          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: '#EF4444' }]}
            onPress={handleRegenerateCards}
          >
            <Icon name="swap-horizontal" size={20} color="#EF4444" />
            <Text style={[styles.dangerButtonText, { color: '#EF4444' }]}>
              Regenerate All Cards
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  studyOptions: {
    margin: 16,
  },
  studyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBar: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priorityScroll: {
    flexDirection: 'row',
  },
  priorityChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  priorityChipEmoji: {
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 9,
    marginTop: 2,
  },
  addCardsBar: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  addCardsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCardsScroll: {
    flexDirection: 'row',
  },
  addCardChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
  },
  addCardChipText: {
    fontSize: 12,
    fontWeight: '600',
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
    padding: 16,
  },
  expandedCardContainer: {
    minHeight: 300,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

