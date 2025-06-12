import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FlashcardCard from '../../components/FlashcardCard';
import LeitnerBoxes from '../../components/LeitnerBoxes';
import CardSwooshAnimation from '../../components/CardSwooshAnimation';
import FrozenCard from '../../components/FrozenCard';

const { width: screenWidth } = Dimensions.get('window');

interface StudyModalProps {
  navigation: any;
  route: any;
}

export default function StudyModal({ navigation, route }: StudyModalProps) {
  // Hide bottom tab bar when this screen is focused
  React.useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined
      });
    };
  }, [navigation]);
  const { topicName, subjectName, subjectColor } = route.params;
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const [loading, setLoading] = useState(true);
  
  // Leitner box state
  const [boxCounts, setBoxCounts] = useState({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
  });
  const [showSwoosh, setShowSwoosh] = useState(false);
  const [swooshData, setSwooshData] = useState({
    fromPosition: { x: 0, y: 0 },
    toBox: 1,
  });
  const cardRef = useRef<View>(null);
  
  // Animation values for swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  useEffect(() => {
    // Add a subtle scale animation when card appears
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  const fetchFlashcards = async () => {
    try {
      console.log('Fetching flashcards for:', { topicName, subjectName });
      
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_name', subjectName)
        .eq('in_study_bank', true)
        .order('created_at', { ascending: false });

      // If topicName is provided and it's not the same as subjectName, filter by topic
      if (topicName && topicName !== subjectName) {
        query = query.eq('topic', topicName);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const allCards = data || [];
      console.log('Total cards fetched:', allCards.length);
      
      // Calculate box counts
      const counts = {
        box1: 0,
        box2: 0,
        box3: 0,
        box4: 0,
        box5: 0,
      };
      
      allCards.forEach(card => {
        const boxKey = `box${card.box_number}` as keyof typeof counts;
        counts[boxKey]++;
      });
      
      setBoxCounts(counts);
      console.log('Box counts:', counts);
      
      // Mark cards as frozen or not based on review date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const cardsWithStatus = allCards.map(card => {
        const reviewDate = new Date(card.next_review_date);
        reviewDate.setHours(0, 0, 0, 0);
        const isFrozen = reviewDate > today;
        
        return {
          ...card,
          isFrozen,
          daysUntilReview: isFrozen ? Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0
        };
      });
      
      // Sort cards: due cards first, then frozen cards
      const sortedCards = cardsWithStatus.sort((a, b) => {
        if (a.isFrozen && !b.isFrozen) return 1;
        if (!a.isFrozen && b.isFrozen) return -1;
        return 0;
      });
      
      console.log('Cards ready for review:', sortedCards.filter(c => !c.isFrozen).length);
      console.log('Frozen cards:', sortedCards.filter(c => c.isFrozen).length);
      
      setFlashcards(sortedCards);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // More sensitive to horizontal swipes
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animations when starting a new gesture
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal movement
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = screenWidth * 0.25; // Lower threshold for easier swiping
        const velocity = gestureState.vx;
        const currentIdx = currentIndexRef.current;
        
        // Consider velocity for more natural swiping
        if ((gestureState.dx > threshold || velocity > 0.5) && currentIdx > 0) {
          // Swipe right - go to previous
          handlePrevious();
        } else if ((gestureState.dx < -threshold || velocity < -0.5) && currentIdx < flashcards.length - 1) {
          // Swipe left - go to next
          handleNext();
        } else {
          // Snap back with spring animation
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

  const handleCardAnswer = async (cardId: string, correct: boolean) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card || card.isFrozen) return;

    const oldBoxNumber = card.box_number;
    const newBoxNumber = correct 
      ? Math.min(card.box_number + 1, 5) 
      : 1;

    // Get card position for swoosh animation
    if (cardRef.current) {
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        setSwooshData({
          fromPosition: { x: pageX + width / 2, y: pageY + height / 2 },
          toBox: newBoxNumber,
        });
        setShowSwoosh(true);
      });
    }

    const daysUntilReview = [1, 2, 3, 7, 30][newBoxNumber - 1];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

    await supabase
      .from('flashcards')
      .update({
        box_number: newBoxNumber,
        next_review_date: nextReviewDate.toISOString(),
      })
      .eq('id', cardId);

    // Update local state
    setFlashcards(flashcards.map(c => 
      c.id === cardId 
        ? { ...c, box_number: newBoxNumber, next_review_date: nextReviewDate.toISOString() }
        : c
    ));

    // Update box counts
    setBoxCounts(prev => ({
      ...prev,
      [`box${oldBoxNumber}`]: prev[`box${oldBoxNumber}` as keyof typeof prev] - 1,
      [`box${newBoxNumber}`]: prev[`box${newBoxNumber}` as keyof typeof prev] + 1,
    }));

    // Auto-advance after a delay
    setTimeout(() => {
      if (currentIndex < flashcards.length - 1) {
        handleNext();
      }
    }, 1500);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={subjectColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (flashcards.length === 0) {
    return (
      <View style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{topicName}</Text>
            <View style={{ minWidth: 50 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No flashcards found for this topic</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <View style={styles.fullScreenContainer}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{topicName}</Text>
          <Text style={styles.counter}>{currentIndex + 1}/{flashcards.length}</Text>
        </View>

        {/* Leitner Boxes Visualization */}
        <View style={styles.leitnerContainer}>
          <LeitnerBoxes 
            boxes={boxCounts} 
            activeBox={currentCard?.box_number}
          />
        </View>

        <View style={styles.mainContent} {...panResponder.panHandlers}>
          <Animated.View 
            style={[
              styles.cardContainer,
              {
                transform: [{ translateX }],
              },
            ]}
          >
            <View ref={cardRef} collapsable={false}>
              {currentCard.isFrozen ? (
                <FrozenCard
                  card={currentCard}
                  color={subjectColor}
                />
              ) : (
                <FlashcardCard
                  card={currentCard}
                  color={subjectColor}
                  onAnswer={(correct) => handleCardAnswer(currentCard.id, correct)}
                />
              )}
            </View>
          </Animated.View>
        </View>

        <View style={styles.bottomSection}>
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
              <Text style={styles.swipeHint}>Swipe to navigate</Text>
            </View>

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
        </View>

        {/* Card Swoosh Animation */}
        <CardSwooshAnimation
          visible={showSwoosh}
          fromPosition={swooshData.fromPosition}
          toBox={swooshData.toBox}
          color={subjectColor}
          onComplete={() => setShowSwoosh(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  counter: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  leitnerContainer: {
    paddingVertical: 8,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  cardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  bottomSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
  progressContainer: {
    flex: 1,
    marginHorizontal: 16,
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
  swipeHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
}); 