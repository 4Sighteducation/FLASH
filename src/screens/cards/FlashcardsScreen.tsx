import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FlashcardCard from '../../components/FlashcardCard';
import StudySlideshowModal from '../../components/StudySlideshowModal';
import { LeitnerSystem } from '../../utils/leitnerSystem';

interface Flashcard {
  id: string;
  question: string;
  answer?: string;
  card_type: 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'manual';
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
  box_number: number;
  subject_name?: string;
  topic?: string;
  next_review_date: string;
  in_study_bank?: boolean;
}

export default function FlashcardsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { subjectName, subjectColor, topicFilter } = route.params as any;
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'studying'>('all');
  const [showSlideshow, setShowSlideshow] = useState(false);

  useEffect(() => {
    fetchFlashcards();
  }, [filter]);

  const fetchFlashcards = async () => {
    try {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_name', subjectName)
        .order('created_at', { ascending: false });

      // Apply topic filter if provided
      if (topicFilter) {
        query = query.eq('topic', topicFilter);
      }

      if (filter === 'studying') {
        // Only show cards that are in study bank
        query = query.eq('in_study_bank', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      Alert.alert('Error', 'Failed to load flashcards');
    } finally {
      setLoading(false);
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
              
              setFlashcards(flashcards.filter(card => card.id !== cardId));
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete card');
            }
          },
        },
      ]
    );
  };

  const handleCardAnswer = async (cardId: string, correct: boolean) => {
    try {
      const card = flashcards.find(c => c.id === cardId);
      if (!card) return;

      // Update box number based on answer using LeitnerSystem
      const newBoxNumber = LeitnerSystem.getNewBoxNumber(card.box_number, correct);
      const nextReviewDate = LeitnerSystem.getNextReviewDate(newBoxNumber);

      const { error } = await supabase
        .from('flashcards')
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', cardId);

      if (error) throw error;

      // Record the review
      const { error: reviewError } = await supabase
        .from('card_reviews')
        .insert({
          flashcard_id: cardId,
          user_id: user?.id,
          quality: correct ? 5 : 1,
          reviewed_at: new Date().toISOString(),
        });

      if (reviewError) throw reviewError;

      // Update local state
      setFlashcards(flashcards.map(c => 
        c.id === cardId 
          ? { ...c, box_number: newBoxNumber, next_review_date: nextReviewDate.toISOString() }
          : c
      ));
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const getStats = () => {
    const total = flashcards.length;
    const studying = flashcards.filter(card => card.in_study_bank === true).length;
    const mastered = flashcards.filter(card => card.box_number === 5).length;
    
    return { total, studying, mastered };
  };

  const stats = getStats();

  const handlePlayPress = () => {
    setShowSlideshow(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={subjectColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {subjectName} {topicFilter ? `- ${topicFilter}` : ''} Flashcards
        </Text>
        <TouchableOpacity onPress={handlePlayPress}>
          <Ionicons name="play-circle" size={28} color={subjectColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: subjectColor }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Cards</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.studying}</Text>
          <Text style={styles.statLabel}>Currently Studying</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FFD700' }]}>{stats.mastered}</Text>
          <Text style={styles.statLabel}>Mastered</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'studying' && styles.activeFilter]}
          onPress={() => setFilter('studying')}
        >
          <Text style={[styles.filterText, filter === 'studying' && styles.activeFilterText]}>
            Only Study Cards
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        {filter === 'studying' && flashcards.length > 0 && (() => {
          // Check if there are any cards due for review
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dueCards = flashcards.filter(card => {
            const reviewDate = new Date(card.next_review_date);
            reviewDate.setHours(0, 0, 0, 0);
            return reviewDate <= today;
          });

          if (dueCards.length > 0) {
            // Show "Ready to Level Up" prompt
            return (
              <TouchableOpacity 
                style={[styles.studyPrompt, { backgroundColor: subjectColor + '15', borderColor: subjectColor }]}
                onPress={() => (navigation as any).navigate('StudyModal', {
                  topicName: topicFilter || subjectName,
                  subjectName,
                  subjectColor,
                })}
              >
                <View style={styles.studyPromptContent}>
                  <Ionicons name="rocket-outline" size={32} color={subjectColor} />
                  <View style={styles.studyPromptTextContainer}>
                    <Text style={[styles.studyPromptTitle, { color: subjectColor }]}>
                      Ready to level up? 🚀
                    </Text>
                    <Text style={styles.studyPromptText}>
                      You have {dueCards.length} card{dueCards.length > 1 ? 's' : ''} due for review. Jump into Study Mode and show what you've learned!
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={subjectColor} />
                </View>
              </TouchableOpacity>
            );
          } else {
            // Show "All Caught Up" message
            return (
              <View style={[styles.caughtUpPrompt, { backgroundColor: '#4CAF5015', borderColor: '#4CAF50' }]}>
                <View style={styles.studyPromptContent}>
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                  <View style={styles.studyPromptTextContainer}>
                    <Text style={[styles.studyPromptTitle, { color: '#4CAF50' }]}>
                      Sweet, you're all caught up! 🎉
                    </Text>
                    <Text style={styles.studyPromptText}>
                      You've mastered these cards like a pro. Time to kick back and relax, or double down and generate some more cards!
                    </Text>
                  </View>
                </View>
              </View>
            );
          }
        })()}

        {flashcards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'studying' ? 'No cards in study mode!' : 'No flashcards yet'}
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: subjectColor }]}
              onPress={() => (navigation as any).navigate('AIGenerator', { 
                subject: subjectName,
                topic: 'General',
                examBoard: (route.params as any)?.examBoard || 'AQA',
                examType: (route.params as any)?.examType || 'GCSE',
              })}
            >
              <Text style={styles.createButtonText}>Create Flashcards</Text>
            </TouchableOpacity>
          </View>
        ) : (
          flashcards.map((card) => (
            <View key={card.id} style={styles.cardWrapper}>
              <FlashcardCard
                card={card}
                color={subjectColor}
                onAnswer={(correct) => handleCardAnswer(card.id, correct)}
                showDeleteButton
                onDelete={() => handleDeleteCard(card.id)}
              />
              {card.in_study_bank && (
                <View style={[styles.boxIndicator, { backgroundColor: subjectColor }]}>
                  <Ionicons name="layers-outline" size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.boxIndicatorText}>Box {card.box_number}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <StudySlideshowModal
        visible={showSlideshow}
        onClose={() => setShowSlideshow(false)}
        flashcards={flashcards}
        subjectColor={subjectColor}
        onCardAnswer={handleCardAnswer}
        isPracticeMode={filter === 'studying'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeFilter: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  boxIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxIndicatorText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  studyPrompt: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderRadius: 12,
    marginBottom: 16,
  },
  caughtUpPrompt: {
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 16,
  },
  studyPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyPromptTextContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  studyPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  studyPromptText: {
    fontSize: 14,
    color: '#666',
  },
}); 