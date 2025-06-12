import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DetailedAnswerModal from './DetailedAnswerModal';

interface FlashcardCardProps {
  card: {
    id: string;
    question: string;
    answer?: string;
    card_type: 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'manual';
    options?: string[];
    correct_answer?: string;
    key_points?: string[];
    detailed_answer?: string;
    box_number: number;
    topic?: string;
    in_study_bank?: boolean;
  };
  color: string;
  onAnswer?: (correct: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

// Helper function to calculate dynamic font size based on text length
const getDynamicFontSize = (text: string, baseSize: number, minSize: number = 12): number => {
  const length = text.length;
  if (length < 50) return baseSize;
  if (length < 100) return Math.max(baseSize - 2, minSize);
  if (length < 150) return Math.max(baseSize - 4, minSize);
  return minSize;
};

export default function FlashcardCard({
  card,
  color,
  onAnswer,
  showDeleteButton,
  onDelete,
}: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [userAnswerCorrect, setUserAnswerCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Reset state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setSelectedOption(null);
    setUserAnswerCorrect(null);
    setShowFeedback(false);
    flipAnimation.setValue(0);
  }, [card.id]);

  const flipCard = () => {
    if (isFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(false));
    } else {
      Animated.spring(flipAnimation, {
        toValue: 1,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start(() => setIsFlipped(true));
    }
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption !== null) return; // Prevent re-selection
    
    setSelectedOption(option);
    if (card.card_type === 'multiple_choice') {
      const isCorrect = option === card.correct_answer;
      if (onAnswer) {
        onAnswer(isCorrect);
      }
      // Auto-flip after selection
      setTimeout(() => flipCard(), 500);
    }
  };

  const getOptionStyle = (option: string) => {
    if (selectedOption === null) return {};
    
    if (option === card.correct_answer) {
      return {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
      };
    } else if (option === selectedOption) {
      return {
        backgroundColor: '#FEE2E2',
        borderColor: '#EF4444',
      };
    }
    return {};
  };

  const questionFontSize = getDynamicFontSize(card.question, 18, 14);
  const optionFontSize = card.options 
    ? getDynamicFontSize(card.options.join(''), 16, 12) 
    : 16;

  const handleUserAnswer = (correct: boolean) => {
    setUserAnswerCorrect(correct);
    setShowFeedback(true);
    if (onAnswer) {
      onAnswer(correct);
    }
    // Auto-hide feedback after 2 seconds
    setTimeout(() => {
      setShowFeedback(false);
    }, 2000);
  };

  const renderFront = () => {
    const isMultipleChoice = card.card_type === 'multiple_choice';
    const needsUserConfirmation = ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    const hasLongContent = isMultipleChoice && card.options && 
      (card.question.length > 100 || card.options.some(opt => opt.length > 50));

    return (
      <TouchableWithoutFeedback onPress={!isMultipleChoice || selectedOption ? flipCard : undefined}>
        <View style={styles.touchableArea}>
          <ScrollView 
            style={styles.cardContent} 
            contentContainerStyle={styles.cardContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {card.topic && (
              <Text style={[styles.topicLabel, { color }]}>{card.topic}</Text>
            )}
            
            <Text style={[styles.question, { fontSize: questionFontSize }]}>
              {card.question}
            </Text>

            {isMultipleChoice && card.options && (
              <View style={[styles.optionsContainer, hasLongContent && styles.compactOptionsContainer]}>
                {card.options.map((option, index) => {
                  // Check if option already has a letter prefix (e.g., "A) ", "a) ", "A. ", "a. ")
                  const letterPrefixMatch = option.match(/^[A-Za-z][\)\.]\s*/);
                  const hasLetterPrefix = letterPrefixMatch !== null;
                  
                  // If it has a prefix, remove it and use our own consistent format
                  const cleanOption = hasLetterPrefix 
                    ? option.substring(letterPrefixMatch[0].length).trim()
                    : option;
                  
                  // Always use our consistent format: "A. Option text"
                  const displayText = `${String.fromCharCode(65 + index)}. ${cleanOption}`;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        hasLongContent && styles.compactOptionButton,
                        getOptionStyle(option),
                      ]}
                      onPress={() => handleOptionSelect(option)}
                      disabled={selectedOption !== null}
                    >
                      <Text style={[
                        styles.optionText,
                        { fontSize: optionFontSize },
                        selectedOption === option && styles.selectedOptionText,
                      ]}>
                        {displayText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {needsUserConfirmation && (
              <View style={styles.speakPrompt}>
                <Ionicons name="mic-outline" size={24} color={color} />
                <Text style={styles.speakPromptText}>
                  Before flipping, try speaking your answer out loud!
                </Text>
              </View>
            )}

            {!isMultipleChoice && (
              <View style={styles.flipHint}>
                <Text style={styles.flipHintText}>Tap anywhere to reveal answer</Text>
                <Ionicons name="refresh-outline" size={20} color="#666" />
              </View>
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderBack = () => {
    const needsUserConfirmation = ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    
    return (
      <TouchableWithoutFeedback onPress={flipCard}>
        <View style={styles.touchableArea}>
          <ScrollView 
            style={styles.cardContent} 
            contentContainerStyle={[
              styles.cardContentContainer,
              needsUserConfirmation && styles.cardContentWithConfirmation
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.backHeader}>
              <Text style={[styles.answerLabel, { color }]}>Answer</Text>
              {(card.detailed_answer || (card.card_type === 'short_answer' && card.key_points && card.answer)) && (
                <TouchableOpacity
                  style={styles.infoButton}
                  onPress={(e: any) => {
                    e.stopPropagation();
                    setShowDetailedModal(true);
                  }}
                >
                  <Ionicons 
                    name="information-circle-outline"
                    size={24} 
                    color={color} 
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.answerContent}>
              {/* Main Answer Section */}
              {card.card_type === 'multiple_choice' && (
                <View style={styles.answerContainer}>
                  <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
                  <Text style={styles.correctAnswerText}>{card.correct_answer}</Text>
                </View>
              )}

              {card.card_type === 'short_answer' && (
                <>
                  {card.answer && (
                    <Text style={styles.answerText}>{card.answer}</Text>
                  )}
                  {!card.answer && card.key_points && card.key_points.length > 0 && (
                    <View style={styles.keyPointsContainer}>
                      {card.key_points.map((point, index) => (
                        <View key={index} style={styles.keyPoint}>
                          <Text style={styles.bulletPoint}>•</Text>
                          <Text style={styles.keyPointText}>{point}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {card.card_type === 'essay' && (
                <View style={styles.essayContainer}>
                  <Text style={styles.essayStructureLabel}>Essay Structure:</Text>
                  {card.key_points && card.key_points.map((point, index) => (
                    <View key={index} style={styles.keyPoint}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.keyPointText}>{point}</Text>
                    </View>
                  ))}
                </View>
              )}

              {card.card_type === 'acronym' && (
                <Text style={styles.acronymAnswer}>{card.answer}</Text>
              )}

              {card.card_type === 'manual' && (
                <Text style={styles.answerText}>{card.answer || 'No answer provided'}</Text>
              )}

              {/* Fallback for any other card types */}
              {!['multiple_choice', 'short_answer', 'essay', 'acronym', 'manual'].includes(card.card_type) && (
                <Text style={styles.answerText}>{card.answer || 'No answer provided'}</Text>
              )}
            </View>

            {/* User Confirmation Section */}
            {needsUserConfirmation && userAnswerCorrect === null && (
              <View style={styles.confirmationSection}>
                <Text style={styles.confirmationPrompt}>Did you get that correct?</Text>
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.yesButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUserAnswer(true)}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.confirmButtonText}>Yes!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.noButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleUserAnswer(false)}
                  >
                    <Ionicons name="close-circle" size={24} color="white" />
                    <Text style={styles.confirmButtonText}>Not quite</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Feedback Message */}
            {showFeedback && userAnswerCorrect !== null && (
              <Animated.View style={[styles.feedbackContainer, { backgroundColor: userAnswerCorrect ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons 
                  name={userAnswerCorrect ? "happy-outline" : "refresh-outline"} 
                  size={32} 
                  color={userAnswerCorrect ? '#10B981' : '#EF4444'} 
                />
                <Text style={[styles.feedbackText, { color: userAnswerCorrect ? '#065F46' : '#991B1B' }]}>
                  {userAnswerCorrect 
                    ? "Well done! Keep up the great work! 🎉" 
                    : "Unlucky! Well done for being honest - you'd only be cheating yourself anyway! 💪"}
                </Text>
              </Animated.View>
            )}

            <View style={styles.flipBackHint}>
              <Text style={styles.flipHintText}>Tap anywhere to flip back</Text>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.card, 
            frontAnimatedStyle, 
            { borderColor: color },
            !isFlipped && styles.cardActive
          ]}
          pointerEvents={isFlipped ? 'none' : 'auto'}
        >
          {renderFront()}
          {showDeleteButton && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </Animated.View>

        <Animated.View 
          style={[
            styles.card, 
            backAnimatedStyle, 
            { borderColor: color },
            isFlipped && styles.cardActive
          ]}
          pointerEvents={isFlipped ? 'auto' : 'none'}
        >
          {renderBack()}
        </Animated.View>
      </View>

      <DetailedAnswerModal
        visible={showDetailedModal}
        onClose={() => setShowDetailedModal(false)}
        detailedAnswer={card.detailed_answer}
        keyPoints={card.card_type === 'short_answer' && card.answer ? card.key_points : undefined}
        cardType={card.card_type}
        color={color}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth - 32,
    height: 420,
    marginVertical: 8,
    alignSelf: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    backfaceVisibility: 'hidden',
  },
  cardActive: {
    zIndex: 10,
  },
  touchableArea: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
  cardContentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  cardContentWithConfirmation: {
    paddingBottom: 20,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactOptionsContainer: {
    justifyContent: 'flex-start',
  },
  optionButton: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  compactOptionButton: {
    padding: 12,
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: '#6366F1',
  },
  correctOption: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  incorrectOption: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  optionText: {
    color: '#374151',
    lineHeight: 20,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 20,
  },
  flipHintText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  flipBackHint: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoButton: {
    padding: 4,
  },
  answerContainer: {
    marginBottom: 16,
  },
  correctAnswerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  keyPointsContainer: {
    marginBottom: 16,
  },
  keyPoint: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#6366F1',
    marginRight: 8,
  },
  keyPointText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    lineHeight: 22,
  },
  answerText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  essayContainer: {
    marginBottom: 16,
  },
  essayStructureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  acronymAnswer: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  speakPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  speakPromptText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  confirmationSection: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmationPrompt: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  yesButton: {
    backgroundColor: '#10B981',
  },
  noButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
  answerContent: {
    flex: 1,
    marginBottom: 16,
  },
}); 