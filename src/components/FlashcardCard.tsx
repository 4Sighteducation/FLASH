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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import DetailedAnswerModal from './DetailedAnswerModal';
import VoiceAnswerModal from './VoiceAnswerModal';
import { useTheme } from '../contexts/ThemeContext';
import { LeitnerSystem } from '../utils/leitnerSystem';
import { abbreviateTopicName } from '../utils/topicNameUtils';

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
    created_at?: string;
  };
  color: string;
  onAnswer?: (correct: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Mobile-first responsive sizing
const IS_MOBILE = screenWidth < 768;

// Width: Much narrower for ManageTopic containers (account for section padding + accordion padding)
// ManageTopic has: section padding (40px) + accordion padding (24px) + margins (32px) = ~96px consumed
const CARD_MAX_WIDTH = IS_MOBILE ? 310 : 600;
const CARD_WIDTH = Math.min(screenWidth - 80, CARD_MAX_WIDTH); // Large margins (80px) for tight containers

// Height: Calculate available space properly
// Screen - Leitner boxes (~120px) - Navigation (~100px) - Header (~60px) - Safe spacing (~60px)
// Increased reserve to prevent overlap
const AVAILABLE_HEIGHT = screenHeight - 340; // Reserve 340px for UI chrome (was 320)
const CARD_HEIGHT = IS_MOBILE 
  ? Math.min(AVAILABLE_HEIGHT * 0.92, 520) // Use 92% (was 95%), max 520px (was 550)
  : 500;

// Helper function to calculate dynamic font size based on text length
const getDynamicFontSize = (text: string, baseSize: number, minSize: number = 14): number => {
  const length = text.length;
  if (length < 60) return baseSize;
  if (length < 120) return Math.max(baseSize - 1, minSize);
  if (length < 180) return Math.max(baseSize - 2, minSize);
  if (length < 250) return Math.max(baseSize - 3, minSize);
  return minSize;
};

// Helper function to calculate font size for multiple choice options
const getOptionsFontSize = (options: string[], baseSize: number = 14): number => {
  const totalLength = options.join('').length;
  const longestOption = Math.max(...options.map(opt => opt.length));
  
  // If any option is very long, reduce font size
  if (longestOption > 120) return 12;
  if (longestOption > 90) return 13;
  if (longestOption > 60) return 13;
  if (totalLength > 400) return 12;
  if (totalLength > 300) return 13;
  if (totalLength > 200) return 13;
  
  return baseSize;
};

// Helper function to strip exam type from subject name
const stripExamType = (subjectName: string): string => {
  // Remove common exam type patterns like "(A-Level)", "(GCSE)", etc.
  return subjectName.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

export default function FlashcardCard({
  card,
  color,
  onAnswer,
  showDeleteButton,
  onDelete,
}: FlashcardCardProps) {
  const { colors, theme } = useTheme();
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [userAnswerCorrect, setUserAnswerCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  
  // Get box info for display
  const boxInfo = LeitnerSystem.getBoxInfo(card.box_number);
  const displayColor = color || colors.primary;

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
        onAnswer(isCorrect === true);
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

  const questionFontSize = getDynamicFontSize(card.question, IS_MOBILE ? 18 : 22, 15);
  const optionFontSize = card.options 
    ? getOptionsFontSize(card.options, IS_MOBILE ? 14 : 16) 
    : 14;

  const handleUserAnswer = (correct: boolean) => {
    setUserAnswerCorrect(correct);
    setShowFeedback(true);
    if (onAnswer) {
      onAnswer(correct === true);
    }
    // Auto-hide feedback after 2 seconds
    setTimeout(() => {
      setShowFeedback(false);
    }, 2000);
  };

  const handleVoiceAnswer = (correct: boolean) => {
    setShowVoiceModal(false);
    handleUserAnswer(correct);
    // Flip the card to show the answer
    if (!isFlipped) {
      flipCard();
    }
  };

  const renderFront = () => {
    const isMultipleChoice = card.card_type === 'multiple_choice';
    const needsUserConfirmation = ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    const hasLongContent = isMultipleChoice && card.options && 
      (card.question.length > 100 || card.options.some(opt => opt.length > 50));

    // Box colors matching the new Leitner design
    const boxColors = {
      1: '#FF6B6B',
      2: '#4ECDC4',
      3: '#45B7D1',
      4: '#96CEB4',
      5: '#DDA0DD',
    };

    const boxLabels = {
      1: 'New',
      2: 'Learning',
      3: 'Growing',
      4: 'Strong',
      5: 'Mastered',
    };

    return (
      <TouchableWithoutFeedback onPress={!isMultipleChoice || selectedOption ? flipCard : undefined}>
        <View style={styles.touchableArea}>
          <ScrollView 
            style={styles.cardContent} 
            contentContainerStyle={styles.cardContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                {card.topic && (
                  <Text style={[styles.topicLabel, { color }]}>{stripExamType(card.topic)}</Text>
                )}
              </View>
              <View style={[
                styles.boxIndicator, 
                { backgroundColor: boxColors[card.box_number as keyof typeof boxColors] || '#666' }
              ]}>
                <Text style={styles.boxIndicatorText}>
                  Box {card.box_number} • {boxLabels[card.box_number as keyof typeof boxLabels] || 'Unknown'}
                </Text>
              </View>
            </View>
            
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
              <View style={styles.voiceAnswerSection}>
                <Text style={styles.voicePromptText}>
                  Try speaking your answer out loud!
                </Text>
                <TouchableOpacity
                  style={[styles.voiceButton, { backgroundColor: color }]}
                  onPress={() => setShowVoiceModal(true)}
                >
                  <Icon name="mic" size={24} color="white" />
                  <Text style={styles.voiceButtonText}>Voice Answer</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isMultipleChoice && (
              <View style={styles.flipHint}>
                <Text style={styles.flipHintText}>Tap anywhere to reveal answer</Text>
                <Icon name="refresh-outline" size={20} color="#666" />
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
                    <Icon name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.confirmButtonText}>Yes!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmButton, styles.noButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleUserAnswer(false)}
                  >
                    <Icon name="close-circle" size={24} color="white" />
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
              <Icon name="trash-outline" size={20} color="#EF4444" />
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

      {['short_answer', 'essay', 'acronym'].includes(card.card_type) && (
        <VoiceAnswerModal
          visible={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onComplete={handleVoiceAnswer}
          card={card as any}
          color={color}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginVertical: 8,
    alignSelf: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0f1e', // Dark theme background
    borderRadius: 20,
    borderWidth: 3,
    backfaceVisibility: 'hidden',
    ...Platform.select({
      web: {
        // Web: Use enhanced border
        borderWidth: 3,
        borderColor: '#00F5FF',
      },
      default: {
        // Mobile: Beautiful neon glow
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
      }
    }),
  },
  cardActive: {
    zIndex: 10,
  },
  touchableArea: {
    flex: 1,
  },
  cardContent: {
    flex: 1,
    padding: IS_MOBILE ? 14 : 20,
  },
  cardContentContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
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
    fontWeight: '700',
    color: '#FFFFFF', // White text on dark background
    marginBottom: 16,
    lineHeight: IS_MOBILE ? 24 : 32,
    fontSize: IS_MOBILE ? 18 : 24,
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  compactOptionsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Translucent on dark
    padding: IS_MOBILE ? 12 : 16,
    borderRadius: 12,
    marginBottom: IS_MOBILE ? 8 : 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    minHeight: IS_MOBILE ? 50 : 64,
    justifyContent: 'center',
  },
  compactOptionButton: {
    padding: 10,
    marginBottom: 6,
    minHeight: 44,
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
    color: '#FFFFFF', // White text
    lineHeight: IS_MOBILE ? 19 : 24,
    fontSize: IS_MOBILE ? 14 : 17,
  },
  selectedOptionText: {
    fontWeight: '600',
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 8,
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
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
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
  voiceAnswerSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    gap: 10,
  },
  voicePromptText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }
    }),
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
    ...Platform.select({
      web: {
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      }
    }),
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  boxIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  boxIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  createdDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
}); 