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
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import DetailedAnswerModal from './DetailedAnswerModal';
import VoiceAnswerModal from './VoiceAnswerModal';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { LeitnerSystem } from '../utils/leitnerSystem';
import { sanitizeTopicLabel } from '../utils/topicNameUtils';
import { showUpgradePrompt } from '../utils/upgradePrompt';
import { useNavigation } from '@react-navigation/native';

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
  // Pro feature: randomize multiple choice option order per review attempt.
  shuffleOptions?: boolean;
  /**
   * Study mode enforces a stricter interaction model:
   * - No "tap anywhere to flip"
   * - MCQ flips only after selecting an option
   * - Other card types can reveal via an explicit control (not by tapping the card face)
   */
  interactionMode?: 'default' | 'study';
  /**
   * Visual/layout variant. `studyHero` is intended for full-height "card is the star" layouts.
   */
  variant?: 'default' | 'studyHero';
  /**
   * Optional Skip hook (Study only): caller can hide this card for the session without DB updates.
   */
  onSkip?: () => void;
  /**
   * Clamp question on front and allow tap-to-expand into a modal for readability.
   */
  allowQuestionExpand?: boolean;
  questionClampLines?: number;
  /**
   * If false, the Voice Answer button remains visible but is disabled/greyed-out.
   * Intended for Study mode UX toggles.
   */
  voiceAnswerEnabled?: boolean;
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
// NOTE: StudyMode has a header + difficulty pills + leitner bar + footer; reserve more height so cards never overlap.
const AVAILABLE_HEIGHT = screenHeight - 430;
const CARD_HEIGHT = IS_MOBILE 
  ? Math.min(AVAILABLE_HEIGHT * 0.88, 470)
  : 500;

// Helper function to calculate dynamic font size based on text length
const getDynamicFontSize = (text: string, baseSize: number, minSize: number = 14): number => {
  const safe = text || '';
  const length = safe.length;
  if (length < 60) return baseSize;
  if (length < 120) return Math.max(baseSize - 1, minSize);
  if (length < 180) return Math.max(baseSize - 2, minSize);
  if (length < 250) return Math.max(baseSize - 3, minSize);
  return minSize;
};

const normalizeMcqOption = (raw?: string | null): string => {
  if (!raw) return '';
  // Strip common letter prefixes like "A) ", "A. ", "a) ", "b. "
  const s = String(raw).replace(/^[A-Za-z][\)\.]\s*/u, '').trim();
  // Normalize whitespace/case
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
};

// Helper function to calculate font size for multiple choice options
const getOptionsFontSize = (options: string[], baseSize: number = 14): number => {
  const safeOptions = (options || []).map((o: any) => String(o ?? ''));
  const totalLength = safeOptions.join('').length;
  const longestOption = safeOptions.length ? Math.max(...safeOptions.map(opt => opt.length)) : 0;
  
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
  const cleaned = sanitizeTopicLabel(subjectName, { maxLength: 140 });
  // Remove common exam type patterns like "(A-Level)", "(GCSE)", etc.
  return cleaned.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

export default function FlashcardCard({
  card,
  color,
  onAnswer,
  showDeleteButton,
  onDelete,
  shuffleOptions = false,
  interactionMode = 'default',
  variant = 'default',
  onSkip,
  allowQuestionExpand = false,
  questionClampLines = 6,
  voiceAnswerEnabled = true,
}: FlashcardCardProps) {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const { limits } = useSubscription();
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [orderedOptions, setOrderedOptions] = useState<string[] | null>(null);
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [userAnswerCorrect, setUserAnswerCorrect] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
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
    setShowQuestionModal(false);
    flipAnimation.setValue(0);
    setOrderedOptions(null);
  }, [card.id]);

  // Shuffle options per card appearance (prevents muscle-memory)
  useEffect(() => {
    if (card.card_type !== 'multiple_choice' || !Array.isArray(card.options)) return;
    const opts = [...card.options];
    if (!shuffleOptions) {
      setOrderedOptions(opts);
      return;
    }
    // Fisher–Yates shuffle
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setOrderedOptions(opts);
  }, [card.id, shuffleOptions]);

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
      const isCorrect = normalizeMcqOption(option) === normalizeMcqOption(card.correct_answer);
      if (onAnswer) {
        onAnswer(isCorrect === true);
      }
      // Auto-flip after selection (not in Study mode; Study uses feedback modal + intermission)
      if (interactionMode !== 'study') {
        setTimeout(() => flipCard(), 500);
      }
    }
  };

  const getOptionStyle = (option: string) => {
    if (selectedOption === null) return {};
    
    const optionNorm = normalizeMcqOption(option);
    const correctNorm = normalizeMcqOption(card.correct_answer);
    const selectedNorm = normalizeMcqOption(selectedOption);

    if (optionNorm && correctNorm && optionNorm === correctNorm) {
      return {
        backgroundColor: '#D1FAE5',
        borderColor: '#10B981',
      };
    } else if (optionNorm && selectedNorm && optionNorm === selectedNorm) {
      return {
        backgroundColor: '#FEE2E2',
        borderColor: '#EF4444',
      };
    }
    return {};
  };

  const questionText = String((card as any)?.question ?? '');
  const optionsArray = Array.isArray((card as any)?.options) ? (card as any).options : undefined;
  const questionFontSize = getDynamicFontSize(questionText, IS_MOBILE ? 18 : 22, 15);
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
    // In Study mode, the parent (StudyModal) will immediately transition this card away;
    // flipping can cause a brief visual glitch, so only flip in non-study modes.
    if (interactionMode !== 'study' && !isFlipped) {
      flipCard();
    }
  };

  const renderFront = () => {
    const isMultipleChoice = card.card_type === 'multiple_choice';
    const needsUserConfirmation = interactionMode === 'study'
      ? ['short_answer', 'essay', 'acronym', 'manual'].includes(card.card_type)
      : ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    const supportsVoiceAnswer = ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    const hasLongContent = isMultipleChoice && card.options && 
      (questionText.length > 100 || card.options.some(opt => String(opt ?? '').length > 50));

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

    const allowTapFlip = interactionMode !== 'study' && (!isMultipleChoice || !!selectedOption);
    const isStudyMcq = interactionMode === 'study' && isMultipleChoice;
    const longestOptionLen = Array.isArray(card.options)
      ? Math.max(0, ...card.options.map(o => (o || '').length))
      : 0;
    const uniformOptionHeight = IS_MOBILE
      ? (longestOptionLen > 110 ? 86 : longestOptionLen > 80 ? 78 : 70)
      : (longestOptionLen > 110 ? 92 : longestOptionLen > 80 ? 84 : 76);

    return (
      <TouchableWithoutFeedback onPress={allowTapFlip ? flipCard : undefined}>
        <View style={styles.touchableArea}>
          {isStudyMcq ? (
          <View style={[styles.cardContent, styles.studyMcqLayout]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                {card.topic && (
                  <Text style={[
                    styles.topicLabel,
                    interactionMode === 'study' && styles.topicLabelStudy,
                    { color }
                  ]}>
                    {stripExamType(card.topic)}
                  </Text>
                )}
              </View>
              <View style={styles.cardHeaderRight}>
                {interactionMode === 'study' && !!onSkip && (
                  <TouchableOpacity style={styles.skipPill} onPress={onSkip}>
                    <Text style={styles.skipPillText}>Skip</Text>
                  </TouchableOpacity>
                )}
                <View style={[
                  styles.boxIndicator, 
                  { backgroundColor: boxColors[card.box_number as keyof typeof boxColors] || '#666' }
                ]}>
                  <Text style={styles.boxIndicatorText}>
                    Box {card.box_number} • {boxLabels[card.box_number as keyof typeof boxLabels] || 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={allowQuestionExpand ? 0.8 : 1}
              onPress={allowQuestionExpand ? () => setShowQuestionModal(true) : undefined}
              disabled={!allowQuestionExpand}
              style={styles.questionBox}
            >
              <Text
                style={[
                  styles.question,
                  styles.questionInBox,
                  { fontSize: questionFontSize, lineHeight: Math.round(questionFontSize * 1.3) },
                ]}
                numberOfLines={allowQuestionExpand ? questionClampLines : undefined}
                ellipsizeMode={allowQuestionExpand ? 'tail' : undefined}
              >
                {questionText || 'No question available'}
              </Text>
              {allowQuestionExpand && questionText.length > 140 && (
                <Text style={styles.readMoreText}>Tap to expand</Text>
              )}
            </TouchableOpacity>

            {isMultipleChoice && card.options && (
              <View style={styles.studyOptionsContainer}>
                {(orderedOptions || card.options).map((option, index) => {
                  const optionStr = String((option as any) ?? '');
                  // Check if option already has a letter prefix (e.g., "A) ", "a) ", "A. ", "a. ")
                  const letterPrefixMatch = optionStr.match(/^[A-Za-z][\)\.]\s*/);
                  const hasLetterPrefix = letterPrefixMatch !== null;
                  
                  // If it has a prefix, remove it and use our own consistent format
                  const cleanOption = hasLetterPrefix 
                    ? optionStr.substring(letterPrefixMatch![0].length).trim()
                    : optionStr;
                  
                  // Always use our consistent format: "A. Option text"
                  const displayText = `${String.fromCharCode(65 + index)}. ${cleanOption}`;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        styles.studyUniformOptionButton,
                        { height: uniformOptionHeight },
                        getOptionStyle(optionStr),
                      ]}
                      onPress={() => handleOptionSelect(optionStr)}
                      disabled={selectedOption !== null}
                    >
                      <Text style={[
                        styles.optionText,
                        styles.optionTextStudy,
                        { fontSize: optionFontSize, lineHeight: Math.round(optionFontSize * 1.32) },
                        normalizeMcqOption(selectedOption) === normalizeMcqOption(optionStr) && styles.selectedOptionText,
                      ]}>
                        {displayText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          ) : (
          <ScrollView 
            style={styles.cardContent} 
            contentContainerStyle={styles.cardContentContainer}
            showsVerticalScrollIndicator={false}
          >

            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                {card.topic && (
                  <Text style={[
                    styles.topicLabel,
                    interactionMode === 'study' && styles.topicLabelStudy,
                    { color }
                  ]}>
                    {stripExamType(card.topic)}
                  </Text>
                )}
              </View>
              <View style={styles.cardHeaderRight}>
                {interactionMode === 'study' && !!onSkip && (
                  <TouchableOpacity style={styles.skipPill} onPress={onSkip}>
                    <Text style={styles.skipPillText}>Skip</Text>
                  </TouchableOpacity>
                )}
                <View style={[
                  styles.boxIndicator, 
                  { backgroundColor: boxColors[card.box_number as keyof typeof boxColors] || '#666' }
                ]}>
                  <Text style={styles.boxIndicatorText}>
                    Box {card.box_number} • {boxLabels[card.box_number as keyof typeof boxLabels] || 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Question */}
            {allowQuestionExpand || variant === 'studyHero' ? (
              <TouchableOpacity
                activeOpacity={allowQuestionExpand ? 0.8 : 1}
                onPress={allowQuestionExpand ? () => setShowQuestionModal(true) : undefined}
                disabled={!allowQuestionExpand}
                style={styles.questionBox}
              >
                <Text
                  style={[
                    styles.question,
                    styles.questionInBox,
                    { fontSize: questionFontSize, lineHeight: Math.round(questionFontSize * 1.3) },
                  ]}
                  numberOfLines={allowQuestionExpand ? questionClampLines : undefined}
                  ellipsizeMode={allowQuestionExpand ? 'tail' : undefined}
                >
                  {questionText || 'No question available'}
                </Text>
                {allowQuestionExpand && questionText.length > 140 && (
                  <Text style={styles.readMoreText}>Tap to expand</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={[styles.question, { fontSize: questionFontSize, lineHeight: Math.round(questionFontSize * 1.28) }]}>
                {questionText || 'No question available'}
              </Text>
            )}

            {/* MCQ options (default layout) */}
            {isMultipleChoice && Array.isArray(card.options) && (
              <View style={[styles.optionsContainer, hasLongContent && styles.compactOptionsContainer]}>
                {(orderedOptions || card.options).map((opt, index) => {
                  const optionStr = String((opt as any) ?? '');
                  const letterPrefixMatch = optionStr.match(/^[A-Za-z][\)\.]\s*/);
                  const hasLetterPrefix = letterPrefixMatch !== null;
                  const cleanOption = hasLetterPrefix
                    ? optionStr.substring(letterPrefixMatch![0].length).trim()
                    : optionStr;
                  const displayText = `${String.fromCharCode(65 + index)}. ${cleanOption}`;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        hasLongContent && styles.compactOptionButton,
                        getOptionStyle(optionStr),
                      ]}
                      onPress={() => handleOptionSelect(optionStr)}
                      disabled={selectedOption !== null}
                    >
                      <Text style={[
                        styles.optionText,
                        { fontSize: optionFontSize, lineHeight: Math.round(optionFontSize * 1.38) },
                        normalizeMcqOption(selectedOption) === normalizeMcqOption(optionStr) && styles.selectedOptionText,
                      ]}>
                        {displayText}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Study: user must commit an answer (self-assess) before any reveal. */}
            {interactionMode === 'study' && !isMultipleChoice && (
              <View style={styles.studySelfAssessSection}>
                <Text style={styles.studySelfAssessPrompt}>How did you do?</Text>
                <View style={styles.studySelfAssessButtons}>
                  <TouchableOpacity
                    style={[styles.studyAssessButton, styles.studyAssessCorrect]}
                    onPress={() => handleUserAnswer(true)}
                    disabled={userAnswerCorrect !== null}
                  >
                    <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.studyAssessText}>Got it</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.studyAssessButton, styles.studyAssessIncorrect]}
                    onPress={() => handleUserAnswer(false)}
                    disabled={userAnswerCorrect !== null}
                  >
                    <Icon name="close-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.studyAssessText}>Not quite</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Voice Answer (Pro feature). Visible in Study mode; can be disabled via per-user toggle. */}
            {supportsVoiceAnswer && needsUserConfirmation && (
              <View style={styles.voiceAnswerSection}>
                <Text style={styles.voicePromptText}>
                  Try speaking your answer out loud!
                </Text>
                <TouchableOpacity
                  style={[
                    styles.voiceButton,
                    { backgroundColor: color },
                    !voiceAnswerEnabled && { opacity: 0.35 },
                  ]}
                  onPress={() => {
                    if (!voiceAnswerEnabled) return;
                    if (!limits.canUseVoiceAnswers) {
                      showUpgradePrompt({
                        title: 'Pro feature',
                        message: 'Voice answers (with AI feedback) are available on Pro.',
                        navigation: navigation as any,
                        ctaLabel: 'View plans',
                      });
                      return;
                    }
                    setShowVoiceModal(true);
                  }}
                  disabled={!voiceAnswerEnabled}
                >
                  <Icon name="mic" size={24} color="white" />
                  <Text style={styles.voiceButtonText}>Voice Answer</Text>
                </TouchableOpacity>
              </View>
            )}

            {interactionMode !== 'study' && !isMultipleChoice && (
              <View style={styles.flipHint}>
                <Text style={styles.flipHintText}>Tap anywhere to reveal answer</Text>
                <Icon name="refresh-outline" size={20} color="#666" />
              </View>
            )}
          </ScrollView>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const renderBack = () => {
    const needsUserConfirmation = interactionMode === 'study'
      ? ['short_answer', 'essay', 'acronym', 'manual'].includes(card.card_type)
      : ['short_answer', 'essay', 'acronym'].includes(card.card_type);
    
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
      <View style={[styles.container, variant === 'studyHero' && styles.containerStudyHero]}>
        <Animated.View 
          style={[
            styles.card,
            variant === 'studyHero' && styles.cardStudyHero,
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
            variant === 'studyHero' && styles.cardStudyHero,
            backAnimatedStyle, 
            { borderColor: color },
            isFlipped && styles.cardActive
          ]}
          pointerEvents={isFlipped ? 'auto' : 'none'}
        >
          {renderBack()}
        </Animated.View>
      </View>

      {/* Question expand modal (Study only) */}
      {allowQuestionExpand ? (
        <Modal
          visible={showQuestionModal}
          animationType="slide"
          onRequestClose={() => setShowQuestionModal(false)}
        >
          <SafeAreaView style={styles.questionModalContainer}>
            <View style={styles.questionModalHeader}>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)} style={styles.questionModalClose}>
                <Icon name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.questionModalTitle}>Question</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView
              style={styles.questionModalScroll}
              contentContainerStyle={styles.questionModalContent}
              showsVerticalScrollIndicator={false}
            >
              {card.topic ? (
                <Text style={[styles.questionModalTopic, { color }]}>{stripExamType(card.topic)}</Text>
              ) : null}
              <Text style={styles.questionModalText}>{questionText || 'No question available'}</Text>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : null}

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
  containerStudyHero: {
    width: '100%',
    flex: 1,
    marginVertical: 0,
    alignSelf: 'stretch',
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
  cardStudyHero: {
    borderRadius: 24,
    borderWidth: 4,
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
  topicLabelStudy: {
    textTransform: 'none',
    opacity: 0.95,
  },
  question: {
    fontWeight: '700',
    color: '#FFFFFF', // White text on dark background
    marginBottom: 16,
    lineHeight: IS_MOBILE ? 24 : 32,
    fontSize: IS_MOBILE ? 18 : 24,
  },
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  questionInBox: {
    marginBottom: 10,
  },
  readMoreText: {
    marginTop: -10,
    marginBottom: 10,
    color: 'rgba(0,245,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  studyMcqLayout: {
    flex: 1,
    paddingTop: IS_MOBILE ? 14 : 18,
    paddingBottom: IS_MOBILE ? 16 : 18,
  },
  studyOptionsContainer: {
    flex: 1,
    justifyContent: 'space-evenly',
    gap: IS_MOBILE ? 10 : 12,
    paddingBottom: 10,
  },
  studyUniformOptionButton: {
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  optionTextStudy: {
    flexShrink: 1,
  },
  compactOptionsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Stronger surface for readability
    padding: IS_MOBILE ? 12 : 16,
    borderRadius: 12,
    marginBottom: IS_MOBILE ? 8 : 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    minHeight: IS_MOBILE ? 50 : 64,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
    textAlign: 'left',
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
    color: '#9CA3AF',
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
    color: '#E5E7EB',
    lineHeight: 22,
  },
  answerText: {
    fontSize: 16,
    color: '#E5E7EB',
    lineHeight: 24,
  },
  essayContainer: {
    marginBottom: 16,
  },
  essayStructureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  acronymAnswer: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  skipPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skipPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  studySelfAssessSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  studySelfAssessPrompt: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  studySelfAssessButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  studyAssessButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  studyAssessCorrect: {
    backgroundColor: '#10B981',
  },
  studyAssessIncorrect: {
    backgroundColor: '#EF4444',
  },
  studyAssessText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  questionModalContainer: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  questionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  questionModalClose: {
    padding: 8,
  },
  questionModalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  questionModalScroll: {
    flex: 1,
  },
  questionModalContent: {
    padding: 18,
  },
  questionModalTopic: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  questionModalText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  createdDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
}); 