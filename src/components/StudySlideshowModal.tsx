import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FlashcardCard from './FlashcardCard';

const { width: screenWidth } = Dimensions.get('window');

interface StudySlideshowModalProps {
  visible: boolean;
  onClose: () => void;
  flashcards: any[];
  subjectColor: string;
  onCardAnswer?: (cardId: string, correct: boolean) => void;
  isPracticeMode?: boolean;
}

export default function StudySlideshowModal({
  visible,
  onClose,
  flashcards,
  subjectColor,
  onCardAnswer,
  isPracticeMode = false,
}: StudySlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      translateX.setValue(0);
    }
  }, [visible]);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      // Slide current card to the left
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Update to next card
        setCurrentIndex(prev => prev + 1);
        // Position new card on the right
        translateX.setValue(screenWidth);
        // Slide new card in from the right
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Slide current card to the right
      Animated.timing(translateX, {
        toValue: screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Update to previous card
        setCurrentIndex(prev => prev - 1);
        // Position new card on the left
        translateX.setValue(-screenWidth);
        // Slide new card in from the left
        Animated.timing(translateX, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = screenWidth * 0.25;
        const velocity = gestureState.vx;
        
        if ((gestureState.dx > threshold || velocity > 0.5) && currentIndex > 0) {
          handlePrevious();
        } else if ((gestureState.dx < -threshold || velocity < -0.5) && currentIndex < flashcards.length - 1) {
          handleNext();
        } else {
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

  const handleCardAnswer = (correct: boolean) => {
    const currentCard = flashcards[currentIndex];
    if (onCardAnswer && currentCard) {
      onCardAnswer(currentCard.id, correct);
    }
    
    // Auto-advance after answering (only if not in practice mode)
    if (!isPracticeMode) {
      setTimeout(() => {
        if (currentIndex < flashcards.length - 1) {
          handleNext();
        }
      }, 1500);
    }
  };

  if (flashcards.length === 0) {
    return null;
  }

  const currentCard = flashcards[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: subjectColor + '10' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPracticeMode ? 'Practice Mode' : 'Study Mode'}
          </Text>
          <Text style={styles.counter}>{currentIndex + 1}/{flashcards.length}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                  backgroundColor: subjectColor 
                }
              ]} 
            />
          </View>
        </View>

        <Animated.View 
          style={[
            styles.cardContainer,
            {
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <FlashcardCard
            card={currentCard}
            color={subjectColor}
            onAnswer={handleCardAnswer}
            showDeleteButton={false}
          />
        </Animated.View>

        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={24} color={currentIndex === 0 ? '#ccc' : '#333'} />
            <Text style={[styles.navButtonText, currentIndex === 0 && styles.disabledText]}>
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={styles.swipeHint}>Swipe to navigate</Text>

          <TouchableOpacity
            style={[styles.navButton, currentIndex === flashcards.length - 1 && styles.disabledButton]}
            onPress={handleNext}
            disabled={currentIndex === flashcards.length - 1}
          >
            <Text style={[styles.navButtonText, currentIndex === flashcards.length - 1 && styles.disabledText]}>
              Next
            </Text>
            <Ionicons name="chevron-forward" size={24} color={currentIndex === flashcards.length - 1 ? '#ccc' : '#333'} />
          </TouchableOpacity>
        </View>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  counter: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 4,
  },
  disabledText: {
    color: '#ccc',
  },
  swipeHint: {
    fontSize: 12,
    color: '#999',
  },
});
