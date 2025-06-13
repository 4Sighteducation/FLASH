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
import CompactLeitnerBoxes from '../../components/CompactLeitnerBoxes';
import CardSwooshAnimation from '../../components/CardSwooshAnimation';
import FrozenCard from '../../components/FrozenCard';
import PointsAnimation from '../../components/PointsAnimation';
import { LeitnerSystem } from '../../utils/leitnerSystem';

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [animationPoints, setAnimationPoints] = useState(0);
  
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
    if (currentIndex < flashcards.length - 1 && !isAnimating) {
      setIsAnimating(true);
      // Slide current card to the left with scale down
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.85,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Update to next card
        setCurrentIndex(prev => prev + 1);
        // Reset position for new card to slide in from right
        translateX.setValue(screenWidth);
        cardScale.setValue(0.85);
        
        // Animate new card sliding in
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
          setIsAnimating(false);
        });
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      // Slide current card to the right with scale down
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.85,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Update to previous card
        setCurrentIndex(prev => prev - 1);
        // Reset position for new card to slide in from left
        translateX.setValue(-screenWidth);
        cardScale.setValue(0.85);
        
        // Animate new card sliding in
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
          setIsAnimating(false);
        });
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (isAnimating) return false;
        // More sensitive to horizontal swipes
        return Math.abs(gestureState.dx) > 5 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx);
      },
      onPanResponderGrant: (e, gestureState) => {
        if (isAnimating) return;
        // Stop any ongoing animations when starting a new gesture
        translateX.stopAnimation();
        cardScale.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isAnimating) return;
        // Only allow horizontal movement
        translateX.setValue(gestureState.dx);
        
        // Add subtle scale effect based on swipe distance
        const scale = 1 - Math.abs(gestureState.dx) / (screenWidth * 3);
        cardScale.setValue(Math.max(0.85, scale));
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isAnimating) return;

        const threshold = screenWidth * 0.15; // Lower threshold for easier swiping
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
          setIsAnimating(true);
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
            setIsAnimating(false);
          });
        }
      },
    })
  ).current;

  const handleCardAnswer = async (cardId: string, correct: boolean) => {
    const card = flashcards.find(c => c.id === cardId);
    if (!card || card.isFrozen || isAnimating) return;

    setIsAnimating(true); // Lock animations during the process

    // Update session statistics
    setSessionStats(prev => ({
      totalReviewed: prev.totalReviewed + 1,
      correctAnswers: prev.correctAnswers + (correct ? 1 : 0),
      incorrectAnswers: prev.incorrectAnswers + (correct ? 0 : 1),
    }));

    const oldBoxNumber = card.box_number;
    const newBoxNumber = LeitnerSystem.getNewBoxNumber(card.box_number, correct);

    // Show feedback with more subtle styling
    setAnswerFeedback({
      correct,
      message: correct 
        ? `Nice! → Box ${newBoxNumber}` 
        : 'Oops! → Box 1'
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
      cardRef.current.measure((x, y, width, height, pageX, pageY) => {
        setSwooshData({
          fromPosition: { x: pageX + width / 2, y: pageY + height / 2 },
          toBox: newBoxNumber,
        });
        setShowSwoosh(true);
      });
    }

    // Use centralized Leitner system for next review date
    const nextReviewDate = LeitnerSystem.getNextReviewDate(newBoxNumber, false);

    // Update database
    await supabase
      .from('flashcards')
      .update({
        box_number: newBoxNumber,
        next_review_date: nextReviewDate.toISOString(),
      })
      .eq('id', cardId);

    // Record the review
    await supabase
      .from('card_reviews')
      .insert({
        flashcard_id: cardId,
        user_id: user?.id,
        was_correct: correct,
        quality: correct ? 5 : 1,
        reviewed_at: new Date().toISOString(),
      });

    // Update local state
    setFlashcards(flashcards.map(c => 
      c.id === cardId 
        ? { ...c, box_number: newBoxNumber, next_review_date: nextReviewDate.toISOString(), isFrozen: true }
        : c
    ));

    // Update box counts
    setBoxCounts(prev => ({
      ...prev,
      [`box${oldBoxNumber}`]: prev[`box${oldBoxNumber}` as keyof typeof prev] - 1,
      [`box${newBoxNumber}`]: prev[`box${newBoxNumber}` as keyof typeof prev] + 1,
    }));

    // Wait for animation to complete before advancing
    setTimeout(() => {
      // Animate feedback modal exit
      Animated.timing(feedbackScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSwoosh(false);
        setShowAnswerFeedback(false);
      });
      
      // Check if there are any more due cards after the current index
      const remainingDueCards = flashcards.slice(currentIndexRef.current + 1).filter(c => !c.isFrozen).length;
      
      if (remainingDueCards === 0) {
        // No more due cards - save session and show completion
        saveStudySession();
      } else if (currentIndexRef.current < flashcards.length - 1) {
        handleNext();
      } else {
        // We're on the last card, so the session should end.
        saveStudySession();
      }
    }, 1800);
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
        setIsAnimating(false); // Unlock animation on error
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
    } catch (error) {
      console.error('Error in saveStudySession:', error);
      setIsAnimating(false); // Unlock animation on error
    }
    
    // Show completion modal
    setShowAllCaughtUp(true);
    // Unlock animations after session is saved
    setIsAnimating(false);
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
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{topicName === 'Daily Review' ? 'Daily Review' : topicName}</Text>
          <Text style={styles.counter}>{currentIndex + 1}/{flashcards.length}</Text>
        </View>

        {/* Leitner Boxes Visualization */}
        <View style={styles.leitnerContainer}>
          <CompactLeitnerBoxes 
            boxes={boxCounts} 
            activeBox={currentCard?.box_number}
          />
        </View>

        <View style={styles.mainContent} {...panResponder.panHandlers}>
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

            {currentIndex === flashcards.length - 1 ? (
              <TouchableOpacity
                style={styles.finishButton}
                onPress={handleClose}
              >
                <Text style={styles.finishButtonText}>Finish</Text>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handleNext}
              >
                <Text style={styles.navButtonText}>Next</Text>
                <Ionicons name="chevron-forward" size={24} color="#333" />
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

        {/* Answer Feedback Modal */}
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
                  size={32} 
                  color={answerFeedback.correct ? '#4CAF50' : '#F44336'} 
                />
                <Text style={[
                  styles.feedbackText,
                  { color: answerFeedback.correct ? '#2E7D32' : '#C62828' }
                ]}>
                  {answerFeedback.message}
                </Text>
              </View>
            </Animated.View>
          </View>
        </Modal>

        {/* All Caught Up Modal */}
        <Modal
          visible={showAllCaughtUp}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.caughtUpOverlay}>
            <View style={styles.caughtUpModal}>
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
                    <Ionicons name={icon} size={80} color={iconColor} />
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
                      <Ionicons name="star" size={24} color="#FFD700" />
                      <Text style={styles.pointsText}>+{pointsEarned} points</Text>
                    </View>
                  </>
                );
              })()}

              <TouchableOpacity 
                style={[styles.caughtUpButton, { backgroundColor: subjectColor }]}
                onPress={() => navigation.navigate('Flashcards', { 
                  subjectName, 
                  subjectColor,
                  topicFilter: topicName !== subjectName ? topicName : undefined 
                })}
              >
                <Text style={styles.caughtUpButtonText}>Back to Card Bank</Text>
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
    paddingBottom: 100, // Space for bottom navigation
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
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  finishButtonText: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 4,
    fontWeight: '600',
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
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
}); 