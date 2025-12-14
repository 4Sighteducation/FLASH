import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
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
  { value: 1, label: "Low Priority", number: '1', color: '#10B981', description: 'Light review only' }, // Green
  { value: 2, label: 'Medium Priority', number: '2', color: '#F59E0B', description: 'Needs attention' }, // Orange
  { value: 3, label: 'High Priority', number: '3', color: '#FF006E', description: 'Serious focus needed' }, // Pink
  { value: 4, label: 'Urgent', number: '4', color: '#EF4444', description: 'Top priority!' }, // Red
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
  const [cardsDue, setCardsDue] = useState(0);
  const [showPriorityInfo, setShowPriorityInfo] = useState(false);
  const [selectedPriorityInfo, setSelectedPriorityInfo] = useState<typeof PRIORITY_LEVELS[0] | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadTopicData();
  }, []);

  // Pulse animation for notification dot
  useEffect(() => {
    if (cardsDue > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [cardsDue]);

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

      // Calculate cards due for this topic
      if (flashcards) {
        const dueCount = flashcards.filter(card => {
          // Box 1 cards are always due
          if (card.box_number === 1) return true;
          
          // Check if card is due for review based on last_studied
          // This would require last_studied field - for now just count Box 1
          return false;
        }).length;
        setCardsDue(dueCount);
      }

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

  const [showNumberPicker, setShowNumberPicker] = useState<{type: string, label: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddMoreCards = (cardType: string) => {
    const labels = {
      'multiple_choice': 'Multiple Choice',
      'short_answer': 'Short Answer',
      'essay': 'Essay',
      'acronym': 'Acronym'
    };
    setShowNumberPicker({ type: cardType, label: labels[cardType as keyof typeof labels] });
  };

  const generateCards = async (numCards: number) => {
    setShowNumberPicker(null);
    setIsGenerating(true);
    
    try {
      const aiService = (await import('../../services/aiService')).AIService;
      const service = new aiService();
      
      const cards = await service.generateCards({
        subject: subjectName,
        topic: topicName,
        examType,
        examBoard,
        questionType: showNumberPicker!.type as any,
        numCards,
      });

      // Save cards directly
      const flashcardData = cards.map(card => ({
        user_id: user?.id,
        subject_name: subjectName,
        topic: topicName,
        topic_id: topicId,
        card_type: showNumberPicker!.type,
        question: card.question,
        answer: card.answer,
        options: card.options,
        correct_answer: card.correctAnswer,
        key_points: card.keyPoints,
        detailed_answer: card.detailedAnswer,
        box_number: 1,
        in_study_bank: true,
        next_review_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('flashcards')
        .insert(flashcardData);

      if (error) throw error;

      Alert.alert('Success!', `${cards.length} cards generated and added!`);
      loadTopicData(); // Refresh
    } catch (error) {
      console.error('Error generating cards:', error);
      Alert.alert('Error', 'Failed to generate cards');
    } finally {
      setIsGenerating(false);
    }
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
      {/* Number Picker Modal */}
      {showNumberPicker && (
        <Modal transparent visible={true} animationType="fade" onRequestClose={() => setShowNumberPicker(null)}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowNumberPicker(null)}
          >
            <View style={[styles.numberPickerModal, { backgroundColor: colors.surface }]}>
              <Text style={[styles.numberPickerTitle, { color: colors.text }]}>
                How many {showNumberPicker.label} cards?
              </Text>
              <View style={styles.numberOptions}>
                {[1, 2, 3, 4, 5].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.numberOption, { backgroundColor: subjectColor }]}
                    onPress={() => generateCards(num)}
                    disabled={isGenerating}
                  >
                    <Text style={styles.numberOptionText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {isGenerating && (
                <View style={styles.generatingIndicator}>
                  <ActivityIndicator color={subjectColor} />
                  <Text style={[styles.generatingText, { color: colors.text }]}>Generating...</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTopicName, { color: colors.text }]} numberOfLines={2}>
            {topicName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {subjectName}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Daily Study Button */}
        {cards.length > 0 && (
          <View style={styles.topSection}>
            <TouchableOpacity
              style={[
                styles.dailyStudyButton,
                { backgroundColor: cardsDue > 0 ? (subjectColor || '#6366F1') : colors.border },
              ]}
              onPress={() => {
                if (cardsDue > 0) {
                  navigation.navigate('StudyModal', {
                    topicName,
                    subjectName,
                    subjectColor,
                    topicId,
                  });
                }
              }}
              disabled={cardsDue === 0}
            >
              <View style={styles.dailyStudyContent}>
                <Icon name="play-circle" size={28} color="#fff" />
                <Text style={styles.dailyStudyText}>
                  {cardsDue > 0 ? 'Complete Daily Study' : 'All done for today'}
                </Text>
                {cardsDue > 0 && (
                  <View style={styles.notificationDot}>
                    <Animated.View 
                      style={[
                        styles.notificationPulse,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]} 
                    />
                    <Text style={styles.notificationText}>{cardsDue}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Priority Selector Button */}
        <View style={[styles.priorityButton, { backgroundColor: colors.surface, borderColor: '#F59E0B' }]}>
          <View style={styles.priorityRow}>
            {PRIORITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.priorityChip,
                  { borderColor: level.color },
                  priority === level.value && { backgroundColor: level.color },
                ]}
                onPress={() => handlePriorityChange(level.value)}
                onLongPress={() => setSelectedPriorityInfo(level)}
              >
                <Text style={[
                  styles.priorityChipNumber,
                  priority === level.value && styles.priorityChipNumberActive
                ]}>
                  {level.number}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.infoIconButton}
              onPress={() => setShowPriorityInfo(true)}
            >
              <Icon name="information-circle" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Type Stats Button */}
        <View style={[styles.cardStatsButton, { backgroundColor: colors.surface }]}>
          <View style={styles.cardStatsRow}>
            <View style={styles.cardStatItem}>
              <Text style={[styles.cardStatNumber, { color: subjectColor }]}>{cards.length}</Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStatItem}>
              <Text style={[styles.cardStatNumber, { color: subjectColor }]}>
                {cardsByType['multiple_choice'] || 0}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>MC</Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStatItem}>
              <Text style={[styles.cardStatNumber, { color: subjectColor }]}>
                {cardsByType['short_answer'] || 0}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>SA</Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStatItem}>
              <Text style={[styles.cardStatNumber, { color: subjectColor }]}>
                {cardsByType['essay'] || 0}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>ES</Text>
            </View>
            <View style={styles.cardStatDivider} />
            <View style={styles.cardStatItem}>
              <Text style={[styles.cardStatNumber, { color: subjectColor }]}>
                {cardsByType['acronym'] || 0}
              </Text>
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>AC</Text>
            </View>
          </View>
        </View>

        {/* Add More Cards Section */}
        <View style={styles.addCardsSection}>
          <Text style={[styles.addCardsTitle, { color: colors.text }]}>➕ Add Cards</Text>
          <View style={styles.addCardsGrid}>
            <TouchableOpacity
              style={[styles.addCardButton, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('multiple_choice')}
            >
              <Text style={[styles.addCardButtonText, { color: subjectColor }]}>
                Multiple{'\n'}Choice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardButton, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('short_answer')}
            >
              <Text style={[styles.addCardButtonText, { color: subjectColor }]}>
                Short{'\n'}Answer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardButton, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('essay')}
            >
              <Text style={[styles.addCardButtonText, { color: subjectColor }]}>Essay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addCardButton, { borderColor: subjectColor }]}
              onPress={() => handleAddMoreCards('acronym')}
            >
              <Text style={[styles.addCardButtonText, { color: subjectColor }]}>Acronym</Text>
            </TouchableOpacity>
          </View>
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
                        card={card as any}
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

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Priority Info Modal */}
      <Modal
        visible={showPriorityInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPriorityInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPriorityInfo(false)}
        >
          <View style={[styles.infoModal, { backgroundColor: colors.surface }]}>
            <View style={styles.infoModalHeader}>
              <Icon name="information-circle" size={32} color="#F59E0B" />
              <Text style={[styles.infoModalTitle, { color: colors.text }]}>
                Why Prioritize?
              </Text>
            </View>
            <Text style={[styles.infoModalText, { color: colors.textSecondary }]}>
              Prioritize topics you find most challenging to optimize your study schedule. 
              Focus on high-priority topics when you have the most energy and concentration.
            </Text>
            <Text style={[styles.infoModalText, { color: colors.textSecondary }]}>
              Use the priority levels to organize your revision and ensure you spend time on what matters most for your exams.
            </Text>
            <TouchableOpacity
              style={[styles.infoModalButton, { backgroundColor: subjectColor }]}
              onPress={() => setShowPriorityInfo(false)}
            >
              <Text style={styles.infoModalButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Individual Priority Level Modal */}
      <Modal
        visible={selectedPriorityInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPriorityInfo(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPriorityInfo(null)}
        >
          <View style={[styles.priorityInfoModal, { backgroundColor: colors.surface, borderColor: selectedPriorityInfo?.color }]}>
            <Text style={styles.priorityInfoEmoji}>{selectedPriorityInfo?.number}</Text>
            <Text style={[styles.priorityInfoTitle, { color: colors.text }]}>
              {selectedPriorityInfo?.label}
            </Text>
            <Text style={[styles.priorityInfoDesc, { color: colors.textSecondary }]}>
              {selectedPriorityInfo?.description}
            </Text>
            <TouchableOpacity
              style={[styles.priorityInfoButton, { backgroundColor: selectedPriorityInfo?.color }]}
              onPress={() => {
                if (selectedPriorityInfo) {
                  handlePriorityChange(selectedPriorityInfo.value);
                  setSelectedPriorityInfo(null);
                }
              }}
            >
              <Text style={styles.priorityInfoButtonText}>Set This Priority</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  headerTopicName: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 13,
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
  priorityButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 12,
  },
  priorityChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityChipNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
  priorityChipNumberActive: {
    color: '#FFFFFF',
  },
  infoIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  cardStatsButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  cardStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  cardStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardStatLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  cardStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  addCardsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addCardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  addCardsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  addCardButton: {
    flex: 1,
    minHeight: 60,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  addCardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModal: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  infoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoModalText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  infoModalButton: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  priorityInfoModal: {
    borderRadius: 20,
    padding: 32,
    width: '85%',
    maxWidth: 320,
    borderWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  priorityInfoEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  priorityInfoTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  priorityInfoDesc: {
    fontSize: 15,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  priorityInfoButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  priorityInfoButtonText: {
    color: '#fff',
    fontSize: 15,
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
    padding: 12,
  },
  expandedCardContainer: {
    height: 420,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // CRITICAL: Clip content to container
  },
  numberPickerModal: {
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  numberPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  numberOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  numberOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberOptionText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  generatingIndicator: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  generatingText: {
    fontSize: 14,
  },
});

