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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import FlashcardCard from './FlashcardCard';
import CardSwooshAnimation from './CardSwooshAnimation';

const { width, height } = Dimensions.get('window');

interface StudyBoxModalProps {
  visible: boolean;
  boxNumber: number;
  onClose: () => void;
  subjectFilter?: string;
  topicFilter?: string;
  subjectColor?: string;
}

interface StudyCard {
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
  in_study_bank: boolean;
}

export default function StudyBoxModal({ 
  visible, 
  boxNumber, 
  onClose,
  subjectFilter,
  topicFilter,
  subjectColor 
}: StudyBoxModalProps) {
  const { user } = useAuth();
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<number | null>(null);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });

  useEffect(() => {
    if (visible) {
      fetchCardsForBox();
    }
  }, [visible, boxNumber, subjectFilter, topicFilter]);

  const fetchCardsForBox = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      
      // First get user's active subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;

      const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];
      
      // Fetch cards for this box that are in study bank and from active subjects
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('box_number', boxNumber)
        .eq('in_study_bank', true)
        .lte('next_review_date', now)
        .order('next_review_date', { ascending: true });

      // Apply filters
      if (subjectFilter) {
        query = query.eq('subject_name', subjectFilter);
      } else {
        query = query.in('subject_name', activeSubjects);
      }

      if (topicFilter) {
        query = query.eq('topic', topicFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setCards(data || []);
      setCurrentIndex(0);
      setSessionStats({ correct: 0, incorrect: 0, total: 0 });
    } catch (error) {
      console.error('Error fetching cards:', error);
      Alert.alert('Error', 'Failed to load cards');
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
    const newBoxNumber = correct ? Math.min(boxNumber + 1, 5) : 1;
    const daysUntilReview = [1, 2, 3, 7, 21][newBoxNumber - 1];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

    // Show animation
    setAnimationTarget(newBoxNumber);
    setShowAnimation(true);

    try {
      // Update card in database
      const { error } = await supabase
        .from('flashcards')
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', card.id);

      if (error) throw error;

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
            'Session Complete!',
            `You reviewed ${sessionStats.total + 1} cards.\n\nCorrect: ${sessionStats.correct + (correct ? 1 : 0)}\nIncorrect: ${sessionStats.incorrect + (!correct ? 1 : 0)}`,
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

  const getBoxTitle = () => {
    const titles = {
      1: 'Daily Review',
      2: 'Every 2 Days',
      3: 'Every 3 Days',
      4: 'Weekly Review',
      5: 'Monthly Review',
    };
    return titles[boxNumber as keyof typeof titles] || `Box ${boxNumber}`;
  };

  const getBoxColor = () => {
    if (subjectColor) return subjectColor;
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
      <SafeAreaView style={[styles.container, { backgroundColor: getBoxColor() + '10' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {subjectFilter ? subjectFilter : getBoxTitle()}
            </Text>
            <Text style={styles.headerSubtitle}>
              {topicFilter && <Text>{topicFilter} • </Text>}
              {cards.length > 0 ? `Card ${currentIndex + 1} of ${cards.length}` : 'No cards due'}
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
            <ActivityIndicator size="large" color={getBoxColor()} />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={80} color={getBoxColor()} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No cards due for review in {getBoxTitle().toLowerCase()}
            </Text>
            <TouchableOpacity style={[styles.doneButton, { backgroundColor: getBoxColor() }]} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cardContainer}>
            <FlashcardCard
              card={cards[currentIndex]}
              color={getBoxColor()}
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
                    backgroundColor: getBoxColor(),
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Animation Overlay */}
        {showAnimation && animationTarget && (
          <CardSwooshAnimation
            visible={showAnimation}
            fromPosition={{ x: width / 2, y: height / 2 }}
            toBox={animationTarget}
            color={getBoxColor()}
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
    borderRadius: 4,
  },
}); 