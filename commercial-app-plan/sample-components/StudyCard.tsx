import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;

interface StudyCardProps {
  card: {
    id: string;
    question: string;
    answer: string;
    questionType: 'multiple_choice' | 'short_answer' | 'essay';
    options?: string[];
    difficulty: number;
    subjectColor: string;
    topicColor: string;
  };
  onSwipeLeft: (cardId: string) => void;
  onSwipeRight: (cardId: string) => void;
  onSwipeUp: (cardId: string) => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({
  card,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  // Rotation interpolation for card tilt
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  // Opacity for swipe indicators
  const likeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });

  const favoriteOpacity = position.y.interpolate({
    inputRange: [-SCREEN_HEIGHT / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Flip animation interpolation
  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: [0, 1],
  });

  const frontRotateY = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backRotateY = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Pan responder for gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Scale down slightly when touched
        Animated.spring(scaleAnimation, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        // Scale back to normal
        Animated.spring(scaleAnimation, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }).start();

        // Check for swipe actions
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right - correct
          Vibration.vibrate(50);
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left - incorrect
          Vibration.vibrate([0, 50, 50, 50]);
          forceSwipe('left');
        } else if (gesture.dy < -SWIPE_THRESHOLD / 2) {
          // Swipe up - favorite
          Vibration.vibrate(100);
          forceSwipe('up');
        } else {
          // Reset position
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right' | 'up') => {
    const x =
      direction === 'right'
        ? SCREEN_WIDTH
        : direction === 'left'
        ? -SCREEN_WIDTH
        : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT : 0;

    Animated.timing(position, {
      toValue: { x, y },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'right') onSwipeRight(card.id);
      else if (direction === 'left') onSwipeLeft(card.id);
      else if (direction === 'up') onSwipeUp(card.id);
      
      position.setValue({ x: 0, y: 0 });
      setIsFlipped(false);
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const flipCard = () => {
    if (isFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(flipAnimation, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
    setIsFlipped(!isFlipped);
    Vibration.vibrate(10);
  };

  const renderCardFront = () => (
    <Animated.View
      style={[
        styles.cardFace,
        {
          opacity: frontOpacity,
          transform: [{ rotateY: frontRotateY }],
        },
      ]}
    >
      <LinearGradient
        colors={[card.subjectColor, card.topicColor]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.questionType}>
            {card.questionType.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.question}>{card.question}</Text>
          {card.options && (
            <View style={styles.options}>
              {card.options.map((option, index) => (
                <View key={index} style={styles.option}>
                  <Text style={styles.optionText}>
                    {String.fromCharCode(65 + index)}. {option}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.difficulty}>
            {[...Array(5)].map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={16}
                color={i < card.difficulty ? '#FFD700' : '#FFFFFF40'}
              />
            ))}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderCardBack = () => (
    <Animated.View
      style={[
        styles.cardFace,
        styles.cardBack,
        {
          opacity: backOpacity,
          transform: [{ rotateY: backRotateY }],
        },
      ]}
    >
      <LinearGradient
        colors={[card.topicColor, card.subjectColor]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardContent}>
          <Text style={styles.answerLabel}>ANSWER</Text>
          <Text style={styles.answer}>{card.answer}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
              { scale: scaleAnimation },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback onPress={flipCard}>
          <View style={styles.cardContainer}>
            {renderCardFront()}
            {renderCardBack()}
            
            {/* Swipe indicators */}
            <Animated.View
              style={[styles.likeIndicator, { opacity: likeOpacity }]}
            >
              <Text style={styles.likeText}>CORRECT</Text>
            </Animated.View>
            
            <Animated.View
              style={[styles.nopeIndicator, { opacity: nopeOpacity }]}
            >
              <Text style={styles.nopeText}>INCORRECT</Text>
            </Animated.View>
            
            <Animated.View
              style={[styles.favoriteIndicator, { opacity: favoriteOpacity }]}
            >
              <Ionicons name="star" size={40} color="#FFD700" />
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.7,
  },
  cardContainer: {
    flex: 1,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  gradient: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  questionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF80',
    marginBottom: 20,
    letterSpacing: 2,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 30,
    lineHeight: 32,
  },
  options: {
    marginTop: 20,
  },
  option: {
    backgroundColor: '#FFFFFF20',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  difficulty: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF80',
    marginBottom: 20,
    letterSpacing: 2,
  },
  answer: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 28,
  },
  likeIndicator: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 1000,
    transform: [{ rotate: '-30deg' }],
  },
  likeText: {
    borderWidth: 4,
    borderColor: '#4FCC4F',
    color: '#4FCC4F',
    fontSize: 32,
    fontWeight: '800',
    padding: 10,
    borderRadius: 10,
  },
  nopeIndicator: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 1000,
    transform: [{ rotate: '30deg' }],
  },
  nopeText: {
    borderWidth: 4,
    borderColor: '#FF4458',
    color: '#FF4458',
    fontSize: 32,
    fontWeight: '800',
    padding: 10,
    borderRadius: 10,
  },
  favoriteIndicator: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    zIndex: 1000,
  },
}); 