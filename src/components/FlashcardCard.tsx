import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    subject_name?: string;
    topic?: string;
  };
  color: string;
  onAnswer?: (correct: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

export default function FlashcardCard({ 
  card, 
  color, 
  onAnswer,
  showDeleteButton = false,
  onDelete 
}: FlashcardCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const flipAnimation = useState(new Animated.Value(0))[0];

  // Get a lighter shade of the parent color for the card background
  const getCardColor = (baseColor: string) => {
    // Convert hex to RGB
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Create a lighter shade (blend with white)
    const factor = 0.7; // 70% of original color, 30% white
    const newR = Math.round(r * factor + 255 * (1 - factor));
    const newG = Math.round(g * factor + 255 * (1 - factor));
    const newB = Math.round(b * factor + 255 * (1 - factor));
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  // Get contrast color for text
  const getContrastColor = (bgColor: string) => {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    return brightness > 0.5 ? '#000000' : '#ffffff';
  };

  const cardColor = getCardColor(color);
  const textColor = getContrastColor(cardColor);

  const flipCard = () => {
    if (card.card_type === 'multiple_choice' && !showResult) {
      // Don't flip if it's MC and no answer selected
      return;
    }

    Animated.timing(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleOptionSelect = (index: number) => {
    if (showResult) return; // Already answered
    
    setSelectedOption(index);
    setShowResult(true);
    
    const isCorrect = card.options?.[index] === card.correct_answer;
    if (onAnswer) {
      onAnswer(isCorrect);
    }
    
    // Auto-flip after a delay for correct answers
    if (isCorrect) {
      setTimeout(() => {
        flipCard();
      }, 1500);
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

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  const renderFront = () => {
    return (
      <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle, { backgroundColor: cardColor }]}>
        {showDeleteButton && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color={textColor} />
          </TouchableOpacity>
        )}
        
        {card.topic && (
          <View style={[styles.topicBadge, { backgroundColor: color }]}>
            <Text style={[styles.topicText, { color: getContrastColor(color) }]}>{card.topic}</Text>
          </View>
        )}
        
        <Text style={[styles.question, { color: textColor }]}>{card.question}</Text>
        
        {card.card_type === 'multiple_choice' && card.options && (
          <View style={styles.optionsContainer}>
            {card.options.map((option, index) => {
              const isSelected = selectedOption === index;
              const isCorrect = option === card.correct_answer;
              const showCorrect = showResult && isCorrect;
              const showIncorrect = showResult && isSelected && !isCorrect;
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    isSelected && styles.selectedOption,
                    showCorrect && styles.correctOption,
                    showIncorrect && styles.incorrectOption,
                  ]}
                  onPress={() => handleOptionSelect(index)}
                  disabled={showResult}
                >
                  <Text style={[
                    styles.optionText,
                    { color: textColor },
                    (showCorrect || showIncorrect) && styles.resultText
                  ]}>
                    {String.fromCharCode(65 + index)}. {option}
                  </Text>
                  {showCorrect && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
                  {showIncorrect && <Ionicons name="close-circle" size={20} color="#F44336" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        
        {card.card_type !== 'multiple_choice' && (
          <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
            <Text style={[styles.flipButtonText, { color: textColor }]}>Tap to reveal answer</Text>
          </TouchableOpacity>
        )}
        
        {card.card_type === 'multiple_choice' && showResult && (
          <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
            <Text style={[styles.flipButtonText, { color: textColor }]}>See detailed explanation</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.boxIndicator}>
          <Text style={[styles.boxText, { color: textColor }]}>Box {card.box_number}</Text>
        </View>
      </Animated.View>
    );
  };

  const renderBack = () => {
    let content;
    
    switch (card.card_type) {
      case 'multiple_choice':
        content = (
          <>
            <Text style={[styles.answerLabel, { color: textColor }]}>Correct Answer:</Text>
            <Text style={[styles.answer, { color: textColor }]}>{card.correct_answer}</Text>
            {card.detailed_answer && (
              <>
                <Text style={[styles.answerLabel, { color: textColor, marginTop: 16 }]}>Explanation:</Text>
                <Text style={[styles.detailedAnswer, { color: textColor }]}>{card.detailed_answer}</Text>
              </>
            )}
          </>
        );
        break;
        
      case 'short_answer':
        content = (
          <>
            <Text style={[styles.answerLabel, { color: textColor }]}>Key Points:</Text>
            {card.key_points?.map((point, index) => (
              <View key={index} style={styles.keyPoint}>
                <Text style={[styles.keyPointText, { color: textColor }]}>• {point}</Text>
              </View>
            ))}
            {card.detailed_answer && (
              <>
                <Text style={[styles.answerLabel, { color: textColor, marginTop: 16 }]}>Detailed Answer:</Text>
                <Text style={[styles.detailedAnswer, { color: textColor }]}>{card.detailed_answer}</Text>
              </>
            )}
          </>
        );
        break;
        
      case 'essay':
        content = (
          <>
            <Text style={[styles.answerLabel, { color: textColor }]}>Essay Structure:</Text>
            {card.key_points?.map((point, index) => (
              <View key={index} style={styles.essayPoint}>
                <Text style={[styles.essayPointNumber, { color: textColor }]}>{index + 1}.</Text>
                <Text style={[styles.essayPointText, { color: textColor }]}>{point}</Text>
              </View>
            ))}
            {card.detailed_answer && (
              <>
                <Text style={[styles.answerLabel, { color: textColor, marginTop: 16 }]}>Model Answer:</Text>
                <Text style={[styles.detailedAnswer, { color: textColor }]}>{card.detailed_answer}</Text>
              </>
            )}
          </>
        );
        break;
        
      case 'acronym':
        content = (
          <>
            <Text style={[styles.answer, { color: textColor }]}>{card.answer}</Text>
            {card.detailed_answer && (
              <>
                <Text style={[styles.answerLabel, { color: textColor, marginTop: 16 }]}>Explanation:</Text>
                <Text style={[styles.detailedAnswer, { color: textColor }]}>{card.detailed_answer}</Text>
              </>
            )}
          </>
        );
        break;
        
      default:
        content = <Text style={[styles.answer, { color: textColor }]}>{card.answer || 'No answer available'}</Text>;
    }
    
    return (
      <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle, { backgroundColor: cardColor }]}>
        {showDeleteButton && (
          <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
            <Ionicons name="trash-outline" size={20} color={textColor} />
          </TouchableOpacity>
        )}
        
        {card.topic && (
          <View style={[styles.topicBadge, { backgroundColor: color }]}>
            <Text style={[styles.topicText, { color: getContrastColor(color) }]}>{card.topic}</Text>
          </View>
        )}
        
        <View style={styles.answerContent}>
          {content}
        </View>
        
        <TouchableOpacity style={styles.flipButton} onPress={flipCard}>
          <Text style={[styles.flipButtonText, { color: textColor }]}>Back to question</Text>
        </TouchableOpacity>
        
        <View style={styles.boxIndicator}>
          <Text style={[styles.boxText, { color: textColor }]}>Box {card.box_number}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderFront()}
      {renderBack()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: Dimensions.get('window').width - 32,
    height: 400,
    marginVertical: 8,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardFront: {
    zIndex: 2,
  },
  cardBack: {
    zIndex: 1,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 10,
  },
  topicBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  topicText: {
    fontSize: 12,
    fontWeight: '600',
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 40,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.2)',
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#F44336',
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  resultText: {
    fontWeight: '600',
  },
  flipButton: {
    marginTop: 'auto',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  flipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  boxIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  boxText: {
    fontSize: 12,
    opacity: 0.7,
  },
  answerContent: {
    flex: 1,
    marginTop: 40,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    fontSize: 18,
    lineHeight: 24,
  },
  detailedAnswer: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  keyPoint: {
    marginVertical: 4,
  },
  keyPointText: {
    fontSize: 16,
    lineHeight: 22,
  },
  essayPoint: {
    flexDirection: 'row',
    marginVertical: 6,
  },
  essayPointNumber: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  essayPointText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
}); 