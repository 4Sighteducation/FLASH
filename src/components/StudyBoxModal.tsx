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
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import FlashcardCard from './FlashcardCard';
import CardSwooshAnimation from './CardSwooshAnimation';
import FrozenCard from './FrozenCard';

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
  isFrozen?: boolean;
  daysUntilReview?: number;
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
  const [showAllCaughtUp, setShowAllCaughtUp] = useState(false);
  
  // Animation values for swipe
  const translateX = React.useRef(new Animated.Value(0)).current;
  const currentIndexRef = React.useRef(0);

  React.useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Pan responder for swipe gestures
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only enable swipe for frozen cards
        const card = cards[currentIndexRef.current];
        return !!(card?.isFrozen && Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx));
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = width * 0.2;
        const velocity = gestureState.vx;
        const currentIdx = currentIndexRef.current;
        
        if ((gestureState.dx > threshold || velocity > 0.3) && currentIdx > 0) {
          // Swipe right - previous
          Animated.timing(translateX, {
            toValue: width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex(currentIdx - 1);
            translateX.setValue(-width);
            Animated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          });
        } else if ((gestureState.dx < -threshold || velocity < -0.3) && currentIdx < cards.length - 1) {
          // Swipe left - next
          Animated.timing(translateX, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setCurrentIndex(currentIdx + 1);
            translateX.setValue(width);
            Animated.timing(translateX, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start();
          });
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
            tension: 80,
          }).start();
        }
      },
    })
  ).current;

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
      
      // Separate due and frozen cards
      const allCards = data || [];
      const nowTime = new Date(now);
      const dueCards = allCards.filter(card => new Date(card.next_review_date) <= nowTime);
      const frozenCards = allCards.filter(card => new Date(card.next_review_date) > nowTime);
      
      // Mark frozen cards
      const markedCards = allCards.map(card => {
        const reviewDate = new Date(card.next_review_date);
        const isFrozen = reviewDate > nowTime;
        const daysUntilReview = isFrozen ? Math.ceil((reviewDate.getTime() - nowTime.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          ...card,
          isFrozen,
          daysUntilReview
        };
      });
      
      // Sort: due cards first, then frozen cards
      markedCards.sort((a, b) => {
        if (a.isFrozen && !b.isFrozen) return 1;
        if (!a.isFrozen && b.isFrozen) return -1;
        return 0;
      });
      
      setCards(markedCards);
      setCurrentIndex(0);
      setSessionStats({ correct: 0, incorrect: 0, total: 0 });
      
      // Show "all caught up" modal if no due cards
      if (dueCards.length === 0 && frozenCards.length > 0) {
        setShowAllCaughtUp(true);
      }
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
    
    // Skip if card is frozen
    if (card.isFrozen) {
      // Just move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onClose();
      }
      return;
    }

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
          <View style={styles.cardContainer} {...panResponder.panHandlers}>
            <Animated.View
              style={{
                transform: [{ translateX }],
              }}
            >
              {cards[currentIndex]?.isFrozen ? (
                <FrozenCard
                  card={cards[currentIndex]}
                  color={getBoxColor()}
                />
              ) : (
                <FlashcardCard
                  card={cards[currentIndex]}
                  color={getBoxColor()}
                  onAnswer={handleCardAnswer}
                  showDeleteButton={false}
                />
              )}
            </Animated.View>
          </View>
        )}

        {/* Navigation for frozen cards */}
        {cards.length > 0 && cards[currentIndex]?.isFrozen && (
          <View style={styles.frozenNavigation}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.disabledNavButton]}
              onPress={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
              disabled={currentIndex === 0}
            >
              <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? '#ccc' : '#333'} />
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.disabledNavText]}>Previous</Text>
            </TouchableOpacity>
            
            <Text style={styles.frozenNavText}>
              {currentIndex + 1} of {cards.length} cards
            </Text>
            
            <TouchableOpacity
              style={[styles.navButton, currentIndex === cards.length - 1 && styles.disabledNavButton]}
              onPress={() => currentIndex < cards.length - 1 && setCurrentIndex(currentIndex + 1)}
              disabled={currentIndex === cards.length - 1}
            >
              <Text style={[styles.navButtonText, currentIndex === cards.length - 1 && styles.disabledNavText]}>Next</Text>
              <Ionicons name="chevron-forward" size={24} color={currentIndex === cards.length - 1 ? '#ccc' : '#333'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Swipe hint for frozen cards */}
        {cards.length > 0 && cards[currentIndex]?.isFrozen && (
          <Text style={styles.swipeHint}>Swipe to navigate</Text>
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

        {/* All Caught Up Modal */}
        <Modal
          visible={showAllCaughtUp}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAllCaughtUp(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowAllCaughtUp(false)}
          >
            <View style={styles.allCaughtUpModal}>
              <Ionicons name="checkmark-circle" size={60} color={getBoxColor()} />
              <Text style={styles.allCaughtUpTitle}>All caught up!</Text>
              <Text style={styles.allCaughtUpSubtitle}>
                No cards due for review in {getBoxTitle().toLowerCase()}
              </Text>
              <Text style={styles.allCaughtUpHint}>
                {cards.length} frozen {cards.length === 1 ? 'card' : 'cards'} to browse
              </Text>
              <TouchableOpacity 
                style={[styles.allCaughtUpButton, { backgroundColor: getBoxColor() }]} 
                onPress={() => setShowAllCaughtUp(false)}
              >
                <Text style={styles.allCaughtUpButtonText}>View Frozen Cards</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allCaughtUpModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 32,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  allCaughtUpTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  allCaughtUpSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  allCaughtUpHint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  allCaughtUpButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  allCaughtUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  frozenNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 4,
  },
  disabledNavText: {
    color: '#ccc',
  },
  frozenNavText: {
    fontSize: 14,
    color: '#666',
  },
  swipeHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
}); 