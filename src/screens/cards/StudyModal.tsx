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
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FlashcardCard from '../../components/FlashcardCard';
import CompactLeitnerBoxes from '../../components/CompactLeitnerBoxes';
import CardSwooshAnimation from '../../components/CardSwooshAnimation';
import FrozenCard from '../../components/FrozenCard';
import PointsAnimation from '../../components/PointsAnimation';
import { LeitnerSystem } from '../../utils/leitnerSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface StudyModalProps {
  navigation: any;
  route: any;
}

export default function StudyModal({ navigation, route }: StudyModalProps) {
  // Hide bottom tab bar when this screen is focused
  React.useLayoutEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }
    return () => {
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined
        });
      }
    };
  }, [navigation]);
  const { topicName, subjectName, subjectColor, boxNumber } = route.params;
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
  const [showAllCaughtUp, setShowAllCaughtUp] = useState(false);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState({ correct: false, message: '' });
  const feedbackScale = useRef(new Animated.Value(0)).current;
  
  // Track session statistics
  const [sessionStats, setSessionStats] = useState({
    totalReviewed: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
  });
  const [pointsEarned, setPointsEarned] = useState(0);
  const sessionStartTime = useRef(new Date());
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [animationPoints, setAnimationPoints] = useState(0);
  
  // New: Session summary and preview
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  const [cardsDeferredToTomorrow, setCardsDeferredToTomorrow] = useState(0);
  const [tomorrowCards, setTomorrowCards] = useState<any[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [initialDueCount, setInitialDueCount] = useState(0);
  
  // Animation values for swipe
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    fetchFlashcards();
  }, []);

  const fetchFlashcards = async () => {
    try {
      console.log('Fetching flashcards for:', { topicName, subjectName, boxNumber });
      
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('in_study_bank', true)
        .order('created_at', { ascending: false });

      // Check if this is Daily Review mode
      if (subjectName === 'All Subjects' && topicName === 'Daily Review') {
        // For daily review, get all due cards from all active subjects
        const { data: userSubjects, error: subjectsError } = await supabase
          .from('user_subjects')
          .select(`
            subject_id,
            subject:exam_board_subjects!subject_id(subject_name)
          `)
          .eq('user_id', user?.id);

        if (subjectsError) throw subjectsError;

        const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];
        
        if (activeSubjects.length > 0) {
          query = query.in('subject_name', activeSubjects);
        }
      } else {
        // Normal mode - filter by subject
        query = query.eq('subject_name', subjectName);
        
        // If topicName is provided and it's not the same as subjectName, filter by topic
        if (topicName && topicName !== subjectName) {
          query = query.eq('topic', topicName);
        }
      }

      // Filter by box number if provided
      if (boxNumber) {
        query = query.eq('box_number', boxNumber);
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
      const cardsWithStatus = allCards.map(card => {
        const isDue = LeitnerSystem.isCardDue(card.next_review_date);
        const isFrozen = !isDue;
        
        const reviewDate = new Date(card.next_review_date);
        const now = new Date();
        const daysUntilReview = isFrozen ? Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          ...card,
          isFrozen,
          daysUntilReview
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
    if (currentIndex < flashcards.length - 1 && !animatingRef.current) {
      animatingRef.current = true;
      
      // Animate current card out
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -screenWidth * 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Update index
        setCurrentIndex(prev => {
          const nextIndex = prev + 1;
          currentIndexRef.current = nextIndex;
          
          // Position new card off-screen
          translateX.setValue(screenWidth);
          cardScale.setValue(0.9);
          
          // Animate new card in after a frame
          setTimeout(() => {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              }),
              Animated.spring(cardScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start(() => {
              animatingRef.current = false;
            });
          }, 16); // One frame delay
          
          return nextIndex;
        });
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && !animatingRef.current) {
      animatingRef.current = true;
      
      // Animate current card out
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: screenWidth * 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Update index
        setCurrentIndex(prev => {
          const prevIndex = prev - 1;
          currentIndexRef.current = prevIndex;
          
          // Position new card off-screen
          translateX.setValue(-screenWidth);
          cardScale.setValue(0.9);
          
          // Animate new card in after a frame
          setTimeout(() => {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              }),
              Animated.spring(cardScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start(() => {
              animatingRef.current = false;
            });
          }, 16); // One frame delay
          
          return prevIndex;
        });
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !animatingRef.current,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (animatingRef.current) return false;
        // More sensitive to horizontal swipes
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: (e, gestureState) => {
        if (animatingRef.current) return;
        // Stop any ongoing animations when starting a new gesture
        translateX.stopAnimation();
        cardScale.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (animatingRef.current) return;
        // Only allow horizontal movement
        translateX.setValue(gestureState.dx);
        
        // Add subtle scale effect based on swipe distance
        const scale = 1 - Math.abs(gestureState.dx) / (screenWidth * 3);
        cardScale.setValue(Math.max(0.85, scale));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (animatingRef.current) return;

        const threshold = screenWidth * 0.25; // Threshold for swipe
        const velocity = gestureState.vx;
        const currentIdx = currentIndexRef.current;
        
        // Determine if we should complete the swipe based on distance and velocity
        const shouldSwipeRight = gestureState.dx > threshold || (velocity > 0.3 && gestureState.dx > 50);
        const shouldSwipeLeft = gestureState.dx < -threshold || (velocity < -0.3 && gestureState.dx < -50);
        
        if (shouldSwipeRight && currentIdx > 0) {
          // Complete swipe right animation then trigger previous
          animatingRef.current = true;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth * 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(cardScale, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Reset and trigger previous
            translateX.setValue(0);
            cardScale.setValue(1);
            animatingRef.current = false;
            handlePrevious();
          });
        } else if (shouldSwipeLeft && currentIdx < flashcards.length - 1) {
          // Complete swipe left animation then trigger next
          animatingRef.current = true;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -screenWidth * 1.2,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(cardScale, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Reset and trigger next
            translateX.setValue(0);
            cardScale.setValue(1);
            animatingRef.current = false;
            handleNext();
          });
        } else {
          // Snap back to center
          animatingRef.current = true;
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            }),
            Animated.spring(cardScale, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
              tension: 40,
            })
                      ]).start(() => {
              animatingRef.current = false;
            });
        }
      },
    })
  ).current;

  const handleCardAnswer = async (cardId: string, correct: boolean) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card || card.isFrozen || animatingRef.current) {
      console.log('⚠️ Answer blocked:', { 
        cardFound: !!card, 
        isFrozen: card?.isFrozen, 
        animating: animatingRef.current 
      });
      return;
    }

    console.log('✅ Processing answer:', { cardId, correct, currentBox: card.box_number });
    animatingRef.current = true; // Lock animations during the process

    // Update session statistics
    setSessionStats(prev => ({
      totalReviewed: prev.totalReviewed + 1,
      correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
      incorrectAnswers: prev.incorrectAnswers + (correct ? 0 : 1),
    }));

    const oldBoxNumber = card.box_number;
    const newBoxNumber = LeitnerSystem.getNewBoxNumber(card.box_number, correct);

    // Track deferred cards
    if (!correct && card.box_number === 1) {
      setCardsDeferredToTomorrow(prev => prev + 1);
    }

    // Enhanced feedback with box names and details
    const boxInfo = LeitnerSystem.getBoxInfo(newBoxNumber);
    const oldBoxInfo = LeitnerSystem.getBoxInfo(oldBoxNumber);
    const feedbackMessage = correct 
      ? `Moving to ${boxInfo.name} ${boxInfo.emoji}\n Review: ${boxInfo.displayInterval}`
      : `Back to ${LeitnerSystem.getBoxInfo(1).name} ${LeitnerSystem.getBoxInfo(1).emoji}\nAvailable: Tomorrow`;

    setAnswerFeedback({
      correct,
      message: feedbackMessage,
      correctAnswer: correct ? null : card.answer, // Show correct answer if wrong
    });
    setShowAnswerFeedback(true);
    
    // Show points animation
    const pointsForAnswer = correct ? 10 : 2;
    setAnimationPoints(pointsForAnswer);
    setShowPointsAnimation(true);
    
    // Animate feedback modal entrance
    Animated.spring(feedbackScale, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    // Get card position for swoosh animation
    if (cardRef.current) {
      try {
        cardRef.current.measure((x, y, width, height, pageX, pageY) => {
          if (pageX !== undefined && pageY !== undefined) {
            setSwooshData({
              fromPosition: { x: pageX + width / 2, y: pageY + height / 2 },
              toBox: newBoxNumber,
            });
            setShowSwoosh(true);
          }
        });
      } catch (error) {
        console.log('⚠️ Measure failed, skipping swoosh animation');
        // Skip animation if measurement fails
      }
    }

    // Use centralized Leitner system for next review date
    const nextReviewDate = LeitnerSystem.getNextReviewDate(newBoxNumber, false);

    // Update database with proper error handling
    try {
      const { error: updateError } = await supabase
        .from('flashcards')
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', cardId);

      if (updateError) {
        console.error('❌ Error updating flashcard:', updateError);
        // Continue anyway - don't block the UI
      }

      // Record the review
      const { error: reviewError } = await supabase
        .from('card_reviews')
        .insert({
          flashcard_id: cardId,
          user_id: user?.id,
          was_correct: correct,
          quality: correct ? 5 : 1,
          reviewed_at: new Date().toISOString(),
        });

      if (reviewError) {
        console.error('❌ Error recording review:', reviewError);
        // Continue anyway - don't block the UI
      }
    } catch (error) {
      console.error('❌ Database operation failed:', error);
      // Continue anyway - update local state and don't block UI
    }

    // Update local state - use functional update to avoid stale state
    setFlashcards(prevCards => {
      const updated = prevCards.map(c => 
        c.id === cardId 
          ? { ...c, box_number: newBoxNumber, next_review_date: nextReviewDate.toISOString(), isFrozen: true }
          : c
      );
      console.log('📝 Flashcards state updated:', { 
        cardId, 
        newBoxNumber,
        frozenCount: updated.filter(c => c.isFrozen).length 
      });
      return updated;
    });

    // Update box counts
    setBoxCounts(prev => ({
      ...prev,
      [`box${oldBoxNumber}`]: prev[`box${oldBoxNumber}` as keyof typeof prev] - 1,
      [`box${newBoxNumber}`]: prev[`box${newBoxNumber}` as keyof typeof prev] + 1,
    }));

    // CRITICAL: Unlock animation BEFORE starting timeout
    // This allows next card to be answered while feedback shows
    console.log('🔓 Unlocking animation lock early');
    animatingRef.current = false;

    // Wait 2 seconds (auto-advance) before proceeding
    setTimeout(() => {
      // Animate feedback modal exit
      Animated.timing(feedbackScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSwoosh(false);
        setShowAnswerFeedback(false);
        
        // Animation lock already unlocked earlier (before setTimeout)
        // animatingRef.current = false; // REMOVED - already unlocked
        
        console.log('🎬 Feedback animation complete, checking remaining cards');
        
        // Check if there are any more due cards after the current index
        // Use functional state to get fresh flashcards array
        setFlashcards(currentCards => {
          const remainingDueCards = currentCards.slice(currentIndexRef.current + 1).filter(c => !c.isFrozen).length;
          console.log('📊 Remaining due cards:', remainingDueCards);

          
          if (remainingDueCards === 0 && currentIndexRef.current === currentCards.length - 1) {
            // No more cards at all - save session and show completion
            console.log('🏁 No more cards, ending session');
            saveStudySession();
          } else if (currentIndexRef.current < currentCards.length - 1) {
            // DON'T call handleNext - just advance index directly (no animation)
            // This prevents re-locking and allows immediate answer on next card
            console.log('➡️ Auto-advancing to next card (no animation)');
            translateX.setValue(0);
            cardScale.setValue(1);
            setCurrentIndex(currentIndexRef.current + 1);
            console.log('✅ Advanced to card', currentIndexRef.current + 2);
          } else {
            // We're on the last card, so the session should end
            console.log('🏁 Last card, ending session');
            saveStudySession();
          }
          
          return currentCards; // Return unchanged
        });
      });
    }, 2000); // Changed from 1800 to 2000ms for 2-second auto-advance
  };

  const saveStudySession = async () => {
    try {
      // Calculate points
      const successRate = sessionStats.totalReviewed > 0 
        ? (sessionStats.correctAnswers / sessionStats.totalReviewed) * 100
        : 0;
      
      let pointsEarned = 0;
      
      // Points for correct/incorrect answers
      pointsEarned += sessionStats.correctAnswers * 10; // 10 points per correct
      pointsEarned += sessionStats.incorrectAnswers * 2; // 2 consolation points
      
      // Bonus points based on performance
      if (successRate === 100 && sessionStats.totalReviewed >= 5) {
        pointsEarned += 50; // Perfect session bonus
      } else if (successRate >= 70 && sessionStats.totalReviewed >= 5) {
        pointsEarned += 25; // Great session bonus
      }
      
      // Calculate session duration
      const sessionDuration = Math.floor((new Date().getTime() - sessionStartTime.current.getTime()) / 1000);
      
      // Save session to database
      const { error: sessionError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user?.id,
          subject_name: subjectName,
          topic_name: topicName,
          cards_reviewed: sessionStats.totalReviewed,
          correct_answers: sessionStats.correctAnswers,
          incorrect_answers: sessionStats.incorrectAnswers,
          success_rate: successRate,
          points_earned: pointsEarned,
          session_duration: sessionDuration,
          started_at: sessionStartTime.current.toISOString(),
        });

      if (sessionError) {
        console.error('Error saving session:', sessionError);
        animatingRef.current = false; // Unlock animation on error
      } else {
        // Update user stats
        await supabase.rpc('update_user_stats_after_session', {
          p_user_id: user?.id,
          p_cards_reviewed: sessionStats.totalReviewed,
          p_correct_answers: sessionStats.correctAnswers,
          p_incorrect_answers: sessionStats.incorrectAnswers,
          p_points_earned: pointsEarned,
        });
        
        // Store points for display
        setPointsEarned(pointsEarned);
      }
      
      // Get tomorrow's cards (deferred Box 1 cards)
      const tomorrow = flashcards.filter(c => c.isFrozen && c.box_number === 1);
      setTomorrowCards(tomorrow);
      
    } catch (error) {
      console.error('Error in saveStudySession:', error);
      animatingRef.current = false; // Unlock animation on error
    }
    
    // Show session summary instead of "all caught up"
    setShowSessionSummary(true);
    // Unlock animations after session is saved
    animatingRef.current = false;
  };
  
  const handlePreviewTomorrow = () => {
    setShowSessionSummary(false);
    setPreviewMode(true);
    
    // Load tomorrow's cards in preview mode
    setFlashcards(tomorrowCards.map(c => ({ ...c, preview: true })));
    setCurrentIndex(0);
  };
  
  const exitPreview = () => {
    setPreviewMode(false);
    navigation.goBack();
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
              <Icon name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{topicName === 'Daily Review' ? 'Daily Review' : topicName}</Text>
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
            <Icon name="close" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{topicName === 'Daily Review' ? 'Daily Review' : topicName}</Text>
            {previewMode && <Text style={styles.previewBadge}>👀 PREVIEW</Text>}
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.counter}>Card {currentIndex + 1}/{initialDueCount}</Text>
            {cardsDeferredToTomorrow > 0 && (
              <Text style={styles.deferredCount}>❌ {cardsDeferredToTomorrow} →tomorrow</Text>
            )}
          </View>
        </View>

        {/* Leitner Boxes Visualization */}
        <View style={styles.leitnerContainer}>
          <CompactLeitnerBoxes 
            boxes={boxCounts} 
            activeBox={currentCard?.box_number}
          />
        </View>

        <View style={styles.mainContent}>
          <View style={styles.swipeableArea} {...panResponder.panHandlers}>
            <Animated.View 
              style={[
                styles.cardContainer,
                {
                  transform: [
                    { translateX },
                    { scale: cardScale }
                  ],
                },
              ]}
            >
              <View ref={cardRef} collapsable={false}>
                {currentCard.isFrozen || previewMode ? (
                  <FrozenCard
                    card={currentCard}
                    color={subjectColor}
                    preview={previewMode}
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
        </View>

        <View style={styles.bottomSection}>
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.disabledButton]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Icon name="chevron-back" size={24} color={currentIndex === 0 ? '#666' : '#00F5FF'} />
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

            {previewMode ? (
              currentIndex === flashcards.length - 1 ? (
                <TouchableOpacity
                  style={styles.exitPreviewButton}
                  onPress={exitPreview}
                >
                  <Text style={styles.exitPreviewText}>Exit Preview</Text>
                  <Icon name="close-circle" size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={handleNext}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                  <Icon name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
              )
            ) : currentIndex === flashcards.length - 1 ? (
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleClose}
              >
                <Text style={styles.finishButtonText}>Finish</Text>
                <Icon name="checkmark-circle" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <Icon name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            )}
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

        {/* Points Animation */}
        <PointsAnimation
          points={animationPoints}
          visible={showPointsAnimation}
          onComplete={() => setShowPointsAnimation(false)}
        />

        {/* Enhanced Answer Feedback Modal */}
        <Modal
          visible={showAnswerFeedback}
          transparent={true}
          animationType="none"
        >
          <View style={styles.feedbackOverlay}>
            <Animated.View 
              style={[
                styles.feedbackModal,
                { 
                  backgroundColor: answerFeedback.correct ? '#E8F5E9' : '#FFEBEE',
                  borderColor: answerFeedback.correct ? '#4CAF50' : '#F44336',
                  transform: [{ scale: feedbackScale }],
                  opacity: feedbackScale
                }
              ]}
            >
              <View style={styles.feedbackContent}>
                <Ionicons 
                  name={answerFeedback.correct ? "checkmark-circle" : "close-circle"} 
                  size={64} 
                  color={answerFeedback.correct ? '#4CAF50' : '#F44336'} 
                />
                <Text style={styles.feedbackTitle}>
                  {answerFeedback.correct ? "Correct!" : "Not Quite!"}
                </Text>
                <Text style={[
                  styles.feedbackText,
                  { color: answerFeedback.correct ? '#2E7D32' : '#C62828' }
                ]}>
                  {answerFeedback.message}
                </Text>
                
                {!answerFeedback.correct && answerFeedback.correctAnswer && (
                  <View style={styles.correctAnswerBox}>
                    <Text style={styles.correctAnswerLabel}>Correct Answer:</Text>
                    <Text style={styles.correctAnswerText}>{answerFeedback.correctAnswer}</Text>
                  </View>
                )}
                
                <View style={styles.autoAdvanceIndicator}>
                  <Text style={styles.autoAdvanceText}>Next in 2s...</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* Session Summary Modal */}
        <Modal
          visible={showSessionSummary}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowSessionSummary(false);
            navigation.goBack();
          }}
        >
          <View style={styles.summaryOverlay}>
            <View style={styles.summaryCard}>
              <Icon name="trophy" size={64} color="#FFD700" />
              <Text style={styles.summaryTitle}>Session Complete!</Text>
              
              <View style={styles.summaryStats}>
                {sessionStats.correctAnswers > 0 && (
                  <View style={styles.summaryStatRow}>
                    <Icon name="checkmark-circle" size={28} color="#4CAF50" />
                    <View style={styles.summaryStatText}>
                      <Text style={styles.summaryStatValue}>{sessionStats.correctAnswers} cards mastered</Text>
                      <Text style={styles.summaryStatDetail}>
                        Moving to {LeitnerSystem.getBoxInfo(2).name} {LeitnerSystem.getBoxInfo(2).emoji}
                      </Text>
                    </View>
                  </View>
                )}
                
                {cardsDeferredToTomorrow > 0 && (
                  <View style={styles.summaryStatRow}>
                    <Icon name="time" size={28} color="#FF9500" />
                    <View style={styles.summaryStatText}>
                      <Text style={styles.summaryStatValue}>{cardsDeferredToTomorrow} cards for tomorrow</Text>
                      <Text style={styles.summaryStatDetail}>
                        Back to New 🌱 (Daily)
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.summaryStatRow}>
                  <Icon name="star" size={28} color="#FFD700" />
                  <View style={styles.summaryStatText}>
                    <Text style={styles.summaryStatValue}>{pointsEarned} XP earned</Text>
                    <Text style={styles.summaryStatDetail}>
                      {sessionStats.totalReviewed} cards reviewed
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.summaryButtons}>
                {tomorrowCards.length > 0 && !previewMode && (
                  <TouchableOpacity 
                    style={styles.previewButton}
                    onPress={handlePreviewTomorrow}
                  >
                    <Icon name="eye-outline" size={20} color="#6366F1" />
                    <Text style={styles.previewButtonText}>Preview Tomorrow</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.doneButton}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* All Caught Up Modal (kept for backwards compat) */}
        <Modal
          visible={showAllCaughtUp}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowAllCaughtUp(false);
            navigation.goBack();
          }}
        >
          <View style={styles.caughtUpOverlay}>
            <View style={styles.caughtUpModal}>
              {/* Close button */}
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAllCaughtUp(false);
                  navigation.goBack();
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>

              {/* Leitner Boxes at the top */}
              <View style={styles.modalLeitnerContainer}>
                <CompactLeitnerBoxes 
                  boxes={boxCounts} 
                  activeBox={undefined}
                />
              </View>

              {/* Performance-based content */}
              {(() => {
                const percentage = sessionStats.totalReviewed > 0 
                  ? Math.round((sessionStats.correctAnswers / sessionStats.totalReviewed) * 100)
                  : 0;

                let icon: any, iconColor: string, title: string, subtitle: string, emoji: string;

                if (percentage === 100) {
                  icon = "trophy";
                  iconColor = "#FFD700";
                  title = "LEGENDARY! 🏆";
                  subtitle = "You absolutely crushed it! Perfect score - you're basically a genius!";
                  emoji = "🔥";
                } else if (percentage >= 70) {
                  icon = "medal";
                  iconColor = "#C0C0C0";
                  title = "Impressive! 🥈";
                  subtitle = "Great job! You're well on your way to mastery. Keep it up!";
                  emoji = "💪";
                } else if (percentage >= 50) {
                  icon = "ribbon";
                  iconColor = "#CD7F32";
                  title = "Not Bad! 🎖️";
                  subtitle = "Solid effort! A bit more practice and you'll be crushing these cards.";
                  emoji = "📈";
                } else if (percentage >= 25) {
                  icon = "barbell";
                  iconColor = "#8B4513";
                  title = "Room to Grow! 🌱";
                  subtitle = "Hey, we all start somewhere! Keep practicing and you'll get there.";
                  emoji = "💡";
                } else if (percentage > 0) {
                  icon = "sad-outline";
                  iconColor = "#696969";
                  title = "Rough Session! 😅";
                  subtitle = "That was... challenging. But hey, failure is just success in progress!";
                  emoji = "🎯";
                } else {
                  icon = "skull-outline";
                  iconColor = "#2C2C2C";
                  title = "Oof! That Hurt! 💀";
                  subtitle = "Well, that was a disaster! But tomorrow's another day, champ!";
                  emoji = "🆘";
                }

                return (
                  <>
                    <Icon name={icon} size={80} color={iconColor} />
                    <Text style={styles.caughtUpTitle}>{title}</Text>
                    <Text style={styles.caughtUpSubtitle}>{subtitle}</Text>
                    
                    {/* Statistics */}
                    <View style={styles.statsSection}>
                      <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Cards Reviewed:</Text>
                        <Text style={styles.statValue}>{sessionStats.totalReviewed}</Text>
                      </View>
                      <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: '#4CAF50' }]}>Correct:</Text>
                        <Text style={[styles.statValue, { color: '#4CAF50' }]}>{sessionStats.correctAnswers}</Text>
                      </View>
                      <View style={styles.statRow}>
                        <Text style={[styles.statLabel, { color: '#F44336' }]}>Incorrect:</Text>
                        <Text style={[styles.statValue, { color: '#F44336' }]}>{sessionStats.incorrectAnswers}</Text>
                      </View>
                      <View style={[styles.statRow, styles.percentageRow]}>
                        <Text style={styles.percentageLabel}>Success Rate:</Text>
                        <Text style={[styles.percentageValue, { color: iconColor }]}>
                          {percentage}% {emoji}
                        </Text>
                      </View>
                    </View>

                    {/* Points Earned */}
                    <View style={styles.pointsContainer}>
                      <Icon name="star" size={24} color="#FFD700" />
                      <Text style={styles.pointsText}>+{pointsEarned} points</Text>
                    </View>
                  </>
                );
              })()}

              <TouchableOpacity 
                style={[styles.caughtUpButton, { backgroundColor: subjectColor }]}
                onPress={() => {
                  setShowAllCaughtUp(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.caughtUpButtonText}>Back to Card Bank</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.continueStudyingButton}
                onPress={() => {
                  setShowAllCaughtUp(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.continueStudyingText}>Continue Studying</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Points Animation */}
        <PointsAnimation
          points={animationPoints}
          visible={showPointsAnimation}
          onComplete={() => setShowPointsAnimation(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const IS_MOBILE = screenWidth < 768;

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#0a0f1e', // Theme dark background
  },
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
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
    paddingHorizontal: IS_MOBILE ? 12 : 16,
    paddingVertical: IS_MOBILE ? 12 : 16,
    backgroundColor: 'rgba(0, 245, 255, 0.08)', // Theme surface
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 245, 255, 0.25)', // Theme border
  },
  closeButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: IS_MOBILE ? 16 : 18,
    fontWeight: '600',
    color: '#FFFFFF', // Theme text
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  counter: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    minWidth: 50,
    textAlign: 'right',
  },
  leitnerContainer: {
    backgroundColor: '#1a1a2e',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 80, // Space for bottom navigation
    paddingTop: 10,
  },
  swipeableArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingHorizontal: IS_MOBILE ? 14 : 18,
    paddingVertical: IS_MOBILE ? 10 : 12,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonText: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#666',
  },
  exitPreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_MOBILE ? 16 : 20,
    paddingVertical: IS_MOBILE ? 10 : 12,
    backgroundColor: '#6366F1',
    borderRadius: 24,
    gap: 6,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  exitPreviewText: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: '#FFFFFF',
    fontWeight: '700',
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
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IS_MOBILE ? 16 : 20,
    paddingVertical: IS_MOBILE ? 10 : 12,
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    gap: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  finishButtonText: {
    fontSize: IS_MOBILE ? 14 : 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  feedbackOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 200,
    backgroundColor: 'transparent',
    pointerEvents: 'none',
  },
  feedbackModal: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 3,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 300,
  },
  feedbackContent: {
    alignItems: 'center',
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  correctAnswerBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    width: '100%',
  },
  correctAnswerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  correctAnswerText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
  },
  autoAdvanceIndicator: {
    marginTop: 16,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  autoAdvanceText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  caughtUpOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  caughtUpModal: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  caughtUpTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  caughtUpSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  caughtUpButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
  },
  caughtUpButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  modalLeitnerContainer: {
    marginBottom: 16,
    marginHorizontal: -32,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
  },
  statsSection: {
    marginTop: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  percentageRow: {
    marginTop: 12,
    paddingTop: 12,
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
  },
  percentageLabel: {
    fontSize: 17,
    color: '#333',
    fontWeight: '600',
  },
  percentageValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF8DC',
    borderRadius: 20,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFB800',
    marginLeft: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  continueStudyingButton: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginTop: 12,
  },
  continueStudyingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // New styles for enhanced features
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  progressInfo: {
    alignItems: 'flex-end',
  },
  deferredCount: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
    marginTop: 2,
  },
  summaryOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  summaryStats: {
    width: '100%',
    marginBottom: 24,
  },
  summaryStatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryStatText: {
    flex: 1,
    marginLeft: 12,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  summaryStatDetail: {
    fontSize: 14,
    color: '#666',
  },
  summaryButtons: {
    width: '100%',
    gap: 12,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#6366F1',
    gap: 8,
  },
  previewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  doneButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#6366F1',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
}); 