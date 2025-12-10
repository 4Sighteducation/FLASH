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
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
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

// Mobile-first responsive constants
const IS_MOBILE = screenWidth < 768;
const CARD_MAX_WIDTH = 650;
const CARD_WIDTH = Math.min(screenWidth - 24, CARD_MAX_WIDTH);
const CARD_MIN_HEIGHT = 450;
const CARD_MAX_HEIGHT = Math.min(screenHeight * 0.65, 550);

export default function FlashcardCard({
  card,
  color,
  onAnswer,
  showDeleteButton = false,
  onDelete,
}: FlashcardCardProps) {
  const { colors, theme } = useTheme();
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;
  
  const displayColor = color || colors.primary;
  const boxInfo = LeitnerSystem.getBoxInfo(card.box_number);

  useEffect(() => {
    // Reset on card change
    setIsFlipped(false);
    setSelectedOption(null);
    setAnswered(false);
    flipAnimation.setValue(0);
  }, [card.id]);

  const flipCard = () => {
    const toValue = isFlipped ? 0 : 1;
    Animated.spring(flipAnimation, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleOptionSelect = (option: string) => {
    if (answered || selectedOption) return;
    
    setSelectedOption(option);
    const isCorrect = option === card.correct_answer;
    
    // Give visual feedback before calling parent
    setTimeout(() => {
      if (onAnswer) {
        onAnswer(isCorrect);
        setAnswered(true);
      }
    }, 100);
  };

  const frontRotation = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnimation.interpolate({
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

  // Render card type badge
  const renderCardTypeBadge = () => {
    const badges = {
      multiple_choice: { text: 'MC', icon: 'list' },
      short_answer: { text: 'SA', icon: 'create' },
      essay: { text: 'Essay', icon: 'document-text' },
      acronym: { text: 'Acronym', icon: 'text' },
      manual: { text: 'Manual', icon: 'hand-left' },
    };
    
    const badge = badges[card.card_type as keyof typeof badges] || badges.manual;
    
    return (
      <View style={[styles.cardTypeBadge, { backgroundColor: colors.surface }]}>
        <Icon name={badge.icon as any} size={14} color={colors.primary} />
        <Text style={[styles.cardTypeText, { color: colors.primary }]}>{badge.text}</Text>
      </View>
    );
  };

  // Render box badge  
  const renderBoxBadge = () => {
    return (
      <View style={[styles.boxBadge, { backgroundColor: displayColor + '20', borderColor: displayColor }]}>
        <Text style={[styles.boxText, { color: displayColor }]}>
          {boxInfo.emoji} {boxInfo.name}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.cardWrapper}>
      {/* Card Container with Neon Glow */}
      <View style={[styles.cardContainer, { 
        shadowColor: displayColor,
        borderColor: displayColor,
      }]}>
        {/* Front Side - Question */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            {
              transform: [{ rotateY: frontRotation }],
              opacity: frontOpacity,
            },
          ]}
        >
          {/* Header Bar with Gradient */}
          <LinearGradient
            colors={[displayColor, displayColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            {card.topic && (
              <Text style={styles.topicLabel} numberOfLines={1}>
                {abbreviateTopicName(card.topic).toUpperCase()}
              </Text>
            )}
            <View style={styles.headerBadges}>
              {renderCardTypeBadge()}
              {renderBoxBadge()}
            </View>
          </LinearGradient>

          {/* Question Content */}
          <ScrollView 
            style={styles.cardContent}
            contentContainerStyle={styles.cardContentInner}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.questionText} numberOfLines={8}>
              {card.question}
            </Text>

            {/* Multiple Choice Options */}
            {card.card_type === 'multiple_choice' && card.options && (
              <View style={styles.optionsContainer}>
                {card.options.map((option, index) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === card.correct_answer;
                  const showResult = answered && selectedOption;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        isSelected && styles.optionSelected,
                        showResult && isCorrect && styles.optionCorrect,
                        showResult && isSelected && !isCorrect && styles.optionWrong,
                        { borderColor: isSelected ? displayColor : colors.border },
                      ]}
                      onPress={() => handleOptionSelect(option)}
                      disabled={answered}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.optionRadio,
                        isSelected && { backgroundColor: displayColor, borderColor: displayColor },
                      ]}>
                        {isSelected && <View style={styles.optionRadioInner} />}
                      </View>
                      <Text 
                        style={[
                          styles.optionText,
                          isSelected && { color: colors.text, fontWeight: '600' },
                        ]}
                        numberOfLines={3}
                      >
                        {option}
                      </Text>
                      {showResult && isCorrect && (
                        <Icon name="checkmark-circle" size={24} color="#4CAF50" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <Icon name="close-circle" size={24} color="#FF6B6B" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Flip Hint for non-MC cards */}
            {card.card_type !== 'multiple_choice' && !isFlipped && (
              <TouchableOpacity style={styles.flipHint} onPress={flipCard}>
                <Icon name="swap-horizontal" size={20} color={displayColor} />
                <Text style={[styles.flipHintText, { color: displayColor }]}>
                  Tap to see answer
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Delete Button if needed */}
          {showDeleteButton && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Icon name="trash" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Back Side - Answer */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              transform: [{ rotateY: backRotation }],
              opacity: backOpacity,
            },
          ]}
        >
          {/* Header Bar */}
          <LinearGradient
            colors={[displayColor, displayColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <Text style={styles.topicLabel}>ANSWER</Text>
            <View style={styles.headerBadges}>
              {renderBoxBadge()}
            </View>
          </LinearGradient>

          {/* Answer Content */}
          <ScrollView 
            style={styles.cardContent}
            contentContainerStyle={styles.cardContentInner}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.answerText}>
              {card.answer || 'No answer provided'}
            </Text>

            {/* Key Points if available */}
            {card.key_points && card.key_points.length > 0 && (
              <View style={styles.keyPointsContainer}>
                <Text style={[styles.keyPointsTitle, { color: displayColor }]}>
                  Key Points:
                </Text>
                {card.key_points.map((point, index) => (
                  <View key={index} style={styles.keyPoint}>
                    <Text style={[styles.keyPointBullet, { color: displayColor }]}>
                      •
                    </Text>
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Flip Back Hint */}
            <TouchableOpacity style={styles.flipHint} onPress={flipCard}>
              <Icon name="swap-horizontal" size={20} color={displayColor} />
              <Text style={[styles.flipHintText, { color: displayColor }]}>
                Tap to flip back
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    minHeight: CARD_MIN_HEIGHT,
    maxHeight: CARD_MAX_HEIGHT,
    alignSelf: 'center',
    marginVertical: 8,
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    backgroundColor: '#0a0f1e',
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardFront: {
    backgroundColor: '#0a0f1e',
  },
  cardBack: {
    backgroundColor: '#0a0f1e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  topicLabel: {
    fontSize: IS_MOBILE ? 11 : 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    flex: 1,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cardTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  boxBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  boxText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardContentInner: {
    padding: IS_MOBILE ? 20 : 28,
    flexGrow: 1,
  },
  questionText: {
    fontSize: IS_MOBILE ? 20 : 24,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: IS_MOBILE ? 28 : 32,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: IS_MOBILE ? 10 : 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 2,
    padding: IS_MOBILE ? 14 : 16,
    minHeight: IS_MOBILE ? 56 : 64,
    gap: 12,
  },
  optionSelected: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  optionWrong: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    fontSize: IS_MOBILE ? 15 : 17,
    color: '#FFFFFF',
    lineHeight: IS_MOBILE ? 20 : 24,
  },
  answerText: {
    fontSize: IS_MOBILE ? 17 : 19,
    color: '#FFFFFF',
    lineHeight: IS_MOBILE ? 26 : 28,
    marginBottom: 20,
  },
  keyPointsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00F5FF',
  },
  keyPointsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  keyPoint: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  keyPointBullet: {
    fontSize: 20,
    marginRight: 8,
    lineHeight: 22,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 20,
    gap: 8,
  },
  flipHintText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
});



