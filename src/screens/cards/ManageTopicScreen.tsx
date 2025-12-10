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
import CardSlideshowModal from '../../components/CardSlideshowModal';

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
  const [showSlideshow, setShowSlideshow] = useState(false);

  useEffect(() => {
    loadTopicData();
  }, []);

  const loadTopicData = async () => {
    try {
      setLoading(true);

      // Fetch all cards for this topic
      const { data: flashcards, error: cardsError } = await supabase
        .from('flashcards')
        .select('id, question, answer, card_type, box_number, created_at, in_study_bank')
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
              style={[styles.studyButton, { backgroundColor: subjectColor || '#6366F1', flex: 1 }]}
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

            <TouchableOpacity
              style={[styles.browseButton, { borderColor: subjectColor, flex: 1 }]}
              onPress={() => setShowSlideshow(true)}
            >
              <Icon name="book" size={24} color={subjectColor} />
              <Text style={[styles.browseButtonText, { color: subjectColor }]}>
                Browse & Flip
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Priority Rating */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 Your Priority</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            How urgent is this topic for you?
          </Text>

          <View style={styles.priorityGrid}>
            {PRIORITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.priorityCard,
                  { borderColor: level.color },
                  priority === level.value && { backgroundColor: level.color },
                ]}
                onPress={() => handlePriorityChange(level.value)}
              >
                <Text style={styles.priorityCardEmoji}>{level.emoji}</Text>
                <Text style={[
                  styles.priorityCardLabel,
                  priority === level.value && { color: '#fff' },
                  priority !== level.value && { color: colors.text },
                ]}>
                  {level.label}
                </Text>
                <Text style={[
                  styles.priorityCardDesc,
                  priority === level.value && { color: 'rgba(255,255,255,0.8)' },
                  priority !== level.value && { color: colors.textSecondary },
                ]}>
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {priorityInfo && (
            <View style={[styles.currentPriority, { backgroundColor: priorityInfo.color + '20' }]}>
              <Text style={[styles.currentPriorityText, { color: priorityInfo.color }]}>
                Current: {priorityInfo.emoji} {priorityInfo.label}
              </Text>
            </View>
          )}
        </View>

        {/* Cards Summary */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📚 Your Cards ({cards.length})</Text>
          
          <View style={styles.cardTypeGrid}>
            {Object.entries(cardsByType).map(([type, count]) => (
              <View key={type} style={styles.cardTypeItem}>
                <Text style={[styles.cardTypeCount, { color: subjectColor }]}>{count}</Text>
                <Text style={[styles.cardTypeLabel, { color: colors.textSecondary }]}>
                  {type === 'multiple_choice' ? 'Multiple Choice' : 
                   type === 'short_answer' ? 'Short Answer' :
                   type === 'essay' ? 'Essay' : type}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Add More Cards */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>➕ Add More Cards</Text>
          
          <TouchableOpacity
            style={[styles.addButton, { borderColor: subjectColor }]}
            onPress={() => handleAddMoreCards('multiple_choice')}
          >
            <Icon name="add-circle" size={20} color={subjectColor} />
            <Text style={[styles.addButtonText, { color: subjectColor }]}>
              Add Multiple Choice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, { borderColor: subjectColor }]}
            onPress={() => handleAddMoreCards('essay')}
          >
            <Icon name="add-circle" size={20} color={subjectColor} />
            <Text style={[styles.addButtonText, { color: subjectColor }]}>
              Add Essay Questions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.addButton, { borderColor: subjectColor }]}
            onPress={() => handleAddMoreCards('short_answer')}
          >
            <Icon name="add-circle" size={20} color={subjectColor} />
            <Text style={[styles.addButtonText, { color: subjectColor }]}>
              Add Short Answer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card List */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 All Cards</Text>
          
          {cards.map((card, index) => (
            <View key={card.id} style={[styles.cardItem, { borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.cardNumber}>
                  <Text style={[styles.cardNumberText, { color: subjectColor }]}>#{index + 1}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                    {card.card_type === 'multiple_choice' ? 'MC' : 
                     card.card_type === 'short_answer' ? 'SA' : 
                     card.card_type === 'essay' ? 'Essay' : card.card_type}
                  </Text>
                  <Text style={[styles.cardBox, { color: colors.textSecondary }]}>
                    • Box {card.box_number}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteCard(card.id)}
                >
                  <Icon name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={2}>
                {card.question}
              </Text>
            </View>
          ))}
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

      {/* Browse Cards Modal */}
      <CardSlideshowModal
        isVisible={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        cards={cards}
        topicName={topicName}
        subjectName={subjectName}
        subjectColor={subjectColor}
      />
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
    flexDirection: 'row',
    gap: 12,
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
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '700',
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
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  priorityCard: {
    flex: 1,
    minWidth: 140,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityCardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  priorityCardLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  priorityCardDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  currentPriority: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPriorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardTypeGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cardTypeItem: {
    flex: 1,
    alignItems: 'center',
  },
  cardTypeCount: {
    fontSize: 32,
    fontWeight: '700',
  },
  cardTypeLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cardItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardMeta: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  cardType: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBox: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  cardQuestion: {
    fontSize: 14,
    lineHeight: 20,
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

