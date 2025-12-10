import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
// We'll create our own simple card component instead of importing

interface Card {
  id: string;
  question?: string;
  answer?: string;
  front?: string;
  back?: string;
  subject?: string;
  topic?: string;
  questionType?: string;
  options?: string[];
  correctAnswer?: string;
  cardColor?: string;
  subjectColor?: string;
}

interface CardSlideshowModalProps {
  isVisible: boolean;
  onClose: () => void;
  cards: Card[];
  topicName: string;
  subjectName: string;
  subjectColor?: string;
}

const { width: screenWidth } = Dimensions.get('window');

// Simple flippable card component
const SimpleFlippableCard = ({ 
  card, 
  isFlipped, 
  onFlip 
}: { 
  card: Card; 
  isFlipped: boolean; 
  onFlip: () => void;
}) => {
  const flipAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isFlipped]);

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };

  const cardColor = card.cardColor || card.subjectColor || '#6366F1';
  const textColor = '#FFFFFF';

  return (
    <TouchableOpacity 
      style={styles.cardContainer} 
      onPress={onFlip}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.card, frontAnimatedStyle, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardLabel, { color: textColor }]}>QUESTION</Text>
        <ScrollView contentContainerStyle={styles.cardContent}>
          <Text style={[styles.cardText, { color: textColor }]}>
            {card.question || card.front || 'No question'}
          </Text>
          {card.questionType === 'multiple_choice' && card.options && (
            <View style={styles.optionsContainer}>
              {card.options.map((option, index) => (
                <View key={index} style={styles.optionItem}>
                  <Text style={[styles.optionText, { color: textColor }]}>
                    {String.fromCharCode(65 + index)}. {option}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, { backgroundColor: cardColor }]}>
        <Text style={[styles.cardLabel, { color: textColor }]}>ANSWER</Text>
        <ScrollView contentContainerStyle={styles.cardContent}>
          <Text style={[styles.cardText, { color: textColor }]}>
            {card.answer || card.back || 'No answer'}
          </Text>
          {card.questionType === 'multiple_choice' && card.correctAnswer && (
            <View style={styles.correctAnswerContainer}>
              <Text style={[styles.correctAnswerLabel, { color: textColor }]}>
                Correct Answer: {card.correctAnswer}
              </Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function CardSlideshowModal({
  isVisible,
  onClose,
  cards,
  topicName,
  subjectName,
  subjectColor = '#6366F1',
}: CardSlideshowModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [isVisible]);

  // Reset flip state when changing cards
  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCardFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const currentCard = cards[currentIndex];

  if (!currentCard) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: subjectColor }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.subjectName}>{subjectName}</Text>
            <Text style={styles.topicName}>{topicName}</Text>
          </View>
          <View style={styles.counterContainer}>
            <Text style={styles.counter}>
              {currentIndex + 1} / {cards.length}
            </Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardWrapper}>
            <SimpleFlippableCard
              card={currentCard}
              isFlipped={isFlipped}
              onFlip={handleCardFlip}
            />
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={currentIndex === 0 ? '#999' : '#FFFFFF'} 
              />
              <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipHintButton}
              onPress={handleCardFlip}
            >
              <Icon name="sync" size={20} color="#FFFFFF" />
              <Text style={styles.flipHintText}>Tap card to flip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, currentIndex === cards.length - 1 && styles.navButtonDisabled]}
              onPress={handleNext}
              disabled={currentIndex === cards.length - 1}
            >
              <Text style={[styles.navButtonText, currentIndex === cards.length - 1 && styles.navButtonTextDisabled]}>
                Next
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color={currentIndex === cards.length - 1 ? '#999' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentIndex + 1) / cards.length) * 100}%` }
              ]} 
            />
          </View>
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  topicName: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  counterContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  counter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 5,
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  flipHintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  flipHintText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 5,
    opacity: 0.9,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 30,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  // Card styles
  cardContainer: {
    width: '100%',
    height: 400,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    padding: 20,
    backfaceVisibility: 'hidden',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  optionsContainer: {
    marginTop: 20,
    width: '100%',
  },
  optionItem: {
    marginVertical: 8,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  correctAnswerContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  correctAnswerLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 