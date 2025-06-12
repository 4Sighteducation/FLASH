import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import FlashcardCard from './FlashcardCard';
import CardSwooshAnimation from './CardSwooshAnimation';

interface DailyCardsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DailyCard {
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
  topic_name?: string;
  next_review_date: string;
}

export default function DailyCardsModal({ visible, onClose }: DailyCardsModalProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<DailyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });

  useEffect(() => {
    if (visible) {
      fetchDailyCards();
    }
  }, [visible]);

  const fetchDailyCards = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // For now, fetch all cards due today directly (until daily_study_cards table is populated)
      const { data: flashcards, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .or('in_study_bank.eq.true,in_study_bank.is.null')
        .lte('next_review_date', today.toISOString())
        .order('box_number', { ascending: true });

      if (error) throw error;
      
      setCards(flashcards || []);
      
      setCurrentIndex(0);
      setSessionStats({ correct: 0, incorrect: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching daily cards:', error);
      Alert.alert('Error', 'Failed to load daily cards');
    } finally {
      setLoading(false);
    }
  };

  const handleCardAnswer = async (correct: boolean) => {
    const card = cards[currentIndex];
    if (!card) return;

    // Update stats
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (!correct ? 1 : 0),
      total: prev.total + 1,
    }));

    // Calculate new box and review date
    const newBoxNumber = correct ? Math.min(card.box_number + 1, 5) : 1;
    const daysUntilReview = [1, 2, 3, 7, 21][newBoxNumber - 1];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

    // Show animation
    setAnimationTarget(newBoxNumber);
    setShowAnimation(true);

    try {
      // Update card in database
      const { error: updateError } = await supabase
        .from('flashcards')
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', card.id);

      if (updateError) throw updateError;

      // Mark daily card as completed
      const today = new Date().toISOString().split('T')[0];
      const { error: dailyError } = await supabase
        .from('daily_study_cards')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id)
        .eq('flashcard_id', card.id)
        .eq('study_date', today);

      if (dailyError) throw dailyError;

      // Wait for animation to complete
      setTimeout(() => {
        setShowAnimation(false);
        setAnimationTarget(null);
        
        // Move to next card or close if done
        if (currentIndex < cards.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // Show completion message
          Alert.alert(
            'Daily Review Complete!',
            `Great job! You've completed your daily review.\n\nCorrect: ${sessionStats.correct + (correct ? 1 : 0)}\nIncorrect: ${sessionStats.incorrect + (!correct ? 1 : 0)}`,
            [{ text: 'OK', onPress: onClose }]
          );
        }
      }, 1500);
    } catch (error) {
      console.error('Error updating card:', error);
      Alert.alert('Error', 'Failed to update card');
    }
  };

  const handleSelfAssessment = (cardId: string) => {
    Alert.alert(
      'How did you do?',
      'Did you answer correctly?',
      [
        { text: 'Incorrect', onPress: () => handleCardAnswer(false), style: 'destructive' },
        { text: 'Correct', onPress: () => handleCardAnswer(true) },
      ]
    );
  };

  const getBoxColor = (boxNumber: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];
    return colors[boxNumber - 1] || '#6366F1';
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Daily Review</Text>
            <Text style={styles.headerSubtitle}>
              {cards.length > 0 ? `Card ${currentIndex + 1} of ${cards.length}` : 'No cards due today'}
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>✓ {sessionStats.correct}</Text>
            <Text style={styles.statsText}>✗ {sessionStats.incorrect}</Text>
          </View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
            <Text style={styles.emptyTitle}>All done for today!</Text>
            <Text style={styles.emptySubtitle}>
              You've completed all your daily reviews. Great job!
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <View style={styles.boxIndicator}>
              <Text style={styles.boxIndicatorText}>
                From Box {cards[currentIndex].box_number}
              </Text>
            </View>
            <FlashcardCard
              card={cards[currentIndex]}
              color={getBoxColor(cards[currentIndex].box_number)}
              onAnswer={handleCardAnswer}
              showDeleteButton={false}
            />
          </View>
        )}

        {/* Progress Bar */}
        {cards.length > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${((currentIndex + 1) / cards.length) * 100}%`,
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {cards.length - currentIndex - 1} cards remaining
            </Text>
          </View>
        )}

        {/* Animation Overlay */}
        {showAnimation && animationTarget && (
          <CardSwooshAnimation
            visible={showAnimation}
            fromPosition={{ x: Dimensions.get('window').width / 2, y: Dimensions.get('window').height / 2 }}
            toBox={animationTarget}
            color={getBoxColor(cards[currentIndex]?.box_number || 1)}
            onComplete={() => setShowAnimation(false)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
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
  closeButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 24,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  boxIndicator: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  boxIndicatorText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
}); 