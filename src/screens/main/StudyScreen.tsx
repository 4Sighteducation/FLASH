import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import LeitnerBoxes from '../../components/LeitnerBoxes';
import StudySubjectAccordion from '../../components/StudySubjectAccordion';
import { UserSubjectWithName } from '../../types/database';
import { debugCards } from '../../utils/debugCards';
import { LeitnerSystem } from '../../utils/leitnerSystem';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface BoxStats {
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  totalDue: number;
  totalInStudyBank: number;
}

interface StudyCard {
  id: string;
  question: string;
  answer?: string;
  card_type: string;
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
  box_number: number;
  subject_name?: string;
  topic_name?: string;
  next_review_date: string;
  in_study_bank: boolean;
}

export default function StudyScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [boxStats, setBoxStats] = useState<BoxStats>({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    totalDue: 0,
    totalInStudyBank: 0,
  });
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [dailyCardCount, setDailyCardCount] = useState(0);
  const [showAccordion, setShowAccordion] = useState(false);
  const [studyFilters, setStudyFilters] = useState<{
    subject?: string;
    topic?: string;
    color?: string;
  }>({});

  useEffect(() => {
    fetchBoxStats();
    fetchDailyCardCount();
  }, []);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBoxStats();
      fetchDailyCardCount();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchBoxStats = async () => {
    try {
      setLoading(true);
      console.log('Starting fetchBoxStats...');
      
      // Debug card states
      if (user?.id) {
        await debugCards.checkCardStates(user.id);
      }
      
      // First get user's active subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', user?.id);

      if (subjectsError) {
        console.error('Error fetching user subjects:', subjectsError);
        throw subjectsError;
      }

      console.log('User subjects:', userSubjects);
      const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];
      
      if (activeSubjects.length === 0) {
        console.log('No active subjects found');
        setBoxStats({
          box1: 0,
          box2: 0,
          box3: 0,
          box4: 0,
          box5: 0,
          totalDue: 0,
          totalInStudyBank: 0,
        });
        return;
      }
      
      // Fetch only cards that are in study bank AND from active subjects
      const { data: cards, error } = await supabase
        .from('flashcards')
        .select('box_number, next_review_date, in_study_bank, subject_name')
        .eq('user_id', user?.id)
        .eq('in_study_bank', true)
        .in('subject_name', activeSubjects);

      if (error) {
        console.error('Error fetching flashcards:', error);
        throw error;
      }

      console.log('Flashcards fetched:', cards?.length);

      const now = new Date();
      const stats: BoxStats = {
        box1: 0,
        box2: 0,
        box3: 0,
        box4: 0,
        box5: 0,
        totalDue: 0,
        totalInStudyBank: cards?.length || 0,
      };

      cards?.forEach(card => {
        // Count cards per box
        const boxKey = `box${card.box_number}` as keyof BoxStats;
        if (boxKey in stats) {
          (stats[boxKey] as number)++;
        }

        // Count due cards
        if (new Date(card.next_review_date) <= now) {
          stats.totalDue++;
        }
      });

      console.log('Box stats calculated:', stats);
      setBoxStats(stats);
    } catch (error) {
      console.error('Error in fetchBoxStats:', error);
      Alert.alert('Error', 'Failed to load study statistics');
      // Set default values on error
      setBoxStats({
        box1: 0,
        box2: 0,
        box3: 0,
        box4: 0,
        box5: 0,
        totalDue: 0,
        totalInStudyBank: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyCardCount = async () => {
    try {
      const now = new Date();
      console.log('Fetching daily card count...');
      
      // First get user's active subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', user?.id);

      if (subjectsError) {
        console.error('Error fetching user subjects for daily cards:', subjectsError);
        throw subjectsError;
      }

      const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];
      
      if (activeSubjects.length === 0) {
        console.log('No active subjects for daily cards');
        setDailyCardCount(0);
        return;
      }
      
      // Count cards due now from active subjects only
      const { count, error } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('in_study_bank', true)
        .in('subject_name', activeSubjects)
        .lte('next_review_date', now.toISOString());

      if (error) {
        console.error('Error fetching daily card count:', error);
        throw error;
      }
      
      console.log('Daily card count:', count);
      setDailyCardCount(count || 0);
    } catch (error) {
      console.error('Error in fetchDailyCardCount:', error);
      setDailyCardCount(0);
    }
  };

  const handleBoxPress = (boxNumber: number) => {
    setSelectedBox(boxNumber);
    setShowAccordion(true);
    setStudyFilters({});
  };

  const handleCloseBoxModal = () => {
    setSelectedBox(null);
    setShowAccordion(false);
    setStudyFilters({});
    fetchBoxStats(); // Refresh stats after studying
  };

  const handleSubjectStudy = (subjectName: string, subjectColor: string, boxNumber?: number) => {
    // Navigate to StudyModal with subject filter
    navigation.navigate('StudyModal', {
      topicName: subjectName,
      subjectName: subjectName,
      subjectColor: subjectColor,
      boxNumber: boxNumber || selectedBox,
    });
    handleCloseBoxModal();
  };

  const handleTopicStudy = (subjectName: string, topicName: string, subjectColor: string, boxNumber?: number) => {
    // Navigate to StudyModal with topic filter
    navigation.navigate('StudyModal', {
      topicName: topicName,
      subjectName: subjectName,
      subjectColor: subjectColor,
      boxNumber: boxNumber || selectedBox,
    });
    handleCloseBoxModal();
  };

  const getBoxInfo = (boxNumber: number): { title: string; description: string; reviewInterval: string } => {
    const boxInfo = {
      1: {
        title: 'Learning Box',
        description: 'New cards (review today) and cards you got wrong (review tomorrow). Master these before they advance.',
        reviewInterval: 'Review: New cards today, Retry cards tomorrow',
      },
      2: {
        title: 'Short-term Memory',
        description: 'Cards you\'re starting to remember. These need review every 2 days.',
        reviewInterval: 'Review: Every 2 days',
      },
      3: {
        title: 'Building Confidence',
        description: 'Cards that are sticking in your memory. Review every 3 days to reinforce.',
        reviewInterval: 'Review: Every 3 days',
      },
      4: {
        title: 'Nearly Mastered',
        description: 'Cards you know well. Just a weekly check-in to keep them fresh.',
        reviewInterval: 'Review: Weekly',
      },
      5: {
        title: 'Mastered',
        description: 'Cards you\'ve mastered! These only need occasional review every 3 weeks.',
        reviewInterval: 'Review: Every 3 weeks',
      },
    };

    return boxInfo[boxNumber as keyof typeof boxInfo] || { title: '', description: '', reviewInterval: '' };
  };

  const handleDailyCardsPress = () => {
    // Navigate to StudyModal with "Daily Review" as the topic
    navigation.navigate('StudyModal', {
      topicName: 'Daily Review',
      subjectName: 'All Subjects',
      subjectColor: '#FF6B6B',
    });
  };

  const navigateToCardBank = () => {
    navigation.navigate('Home' as never);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1f3a', '#2d3561']}
        style={styles.gradientBackground}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerTitleContainer}>
                <Ionicons name="school" size={32} color="#00D4FF" />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>Study Hub</Text>
                  <Text style={styles.headerSubtitle}>
                    Your personal learning space
                  </Text>
                </View>
              </View>
              <View style={styles.headerStats}>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatValue}>{boxStats.totalInStudyBank}</Text>
                  <Text style={styles.headerStatLabel}>Total Cards</Text>
                </View>
                <View style={styles.headerStatDivider} />
                <View style={styles.headerStatItem}>
                  <Text style={[styles.headerStatValue, styles.dueStatValue]}>{boxStats.totalDue}</Text>
                  <Text style={styles.headerStatLabel}>Due Now</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Daily Cards Section */}
          {dailyCardCount > 0 && (
            <TouchableOpacity 
              style={styles.dailyCardsCard}
              onPress={handleDailyCardsPress}
            >
              <View style={styles.dailyCardsContent}>
                <View style={styles.dailyCardsLeft}>
                  <Ionicons name="today" size={32} color="#FF6B6B" />
                  <View style={styles.dailyCardsText}>
                    <Text style={styles.dailyCardsTitle}>Daily Review</Text>
                    <Text style={styles.dailyCardsSubtitle}>
                      {dailyCardCount} cards due today
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          )}

          {/* Leitner Boxes Visual */}
          <View style={styles.boxesContainer}>
            <LeitnerBoxes
              boxes={{
                box1: boxStats.box1,
                box2: boxStats.box2,
                box3: boxStats.box3,
                box4: boxStats.box4,
                box5: boxStats.box5,
              }}
              activeBox={selectedBox || undefined}
            />
          </View>

          {/* Box Details */}
          <View style={styles.boxDetailsContainer}>
            {[1, 2, 3, 4, 5].map((boxNumber) => {
              const info = getBoxInfo(boxNumber);
              const count = boxStats[`box${boxNumber}` as keyof BoxStats] as number;
              const totalCards = boxStats.totalInStudyBank || 1;
              const percentage = Math.round((count / totalCards) * 100);
              
              const boxIcons = {
                1: { icon: 'flash', color: '#FF6B6B' },
                2: { icon: 'trending-up', color: '#4ECDC4' },
                3: { icon: 'rocket', color: '#45B7D1' },
                4: { icon: 'shield-checkmark', color: '#96CEB4' },
                5: { icon: 'trophy', color: '#DDA0DD' },
              };
              
              const boxIcon = boxIcons[boxNumber as keyof typeof boxIcons];
              
              return (
                <TouchableOpacity
                  key={boxNumber}
                  style={styles.boxDetailCard}
                  onPress={() => handleBoxPress(boxNumber)}
                >
                  <View style={styles.boxDetailContent}>
                    <View style={[styles.boxIconContainer, { backgroundColor: boxIcon.color + '20' }]}>
                      <Ionicons name={boxIcon.icon as any} size={24} color={boxIcon.color} />
                    </View>
                    <View style={styles.boxDetailInfo}>
                      <Text style={styles.boxDetailTitle}>{info.title}</Text>
                      <Text style={styles.boxDetailInterval}>{info.reviewInterval}</Text>
                    </View>
                    <View style={styles.boxDetailStats}>
                      <View style={styles.boxCountContainer}>
                        <Text style={styles.boxDetailCount}>{count}</Text>
                        <Text style={styles.boxDetailCountLabel}>cards</Text>
                      </View>
                      <View style={styles.boxProgressBar}>
                        <View 
                          style={[
                            styles.boxProgressFill,
                            { 
                              width: `${percentage}%`,
                              backgroundColor: boxIcon.color 
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Study Box Modal - Shows accordion when first opened */}
        {showAccordion && selectedBox !== null && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={handleCloseBoxModal}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCloseBoxModal} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Box {selectedBox} - Select Subject</Text>
                <View style={{ width: 28 }} />
              </View>
              <StudySubjectAccordion
                boxNumber={selectedBox}
                onSubjectStudy={handleSubjectStudy}
                onTopicStudy={handleTopicStudy}
              />
            </SafeAreaView>
          </Modal>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1f3a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  headerStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  headerStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  headerStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  boxesContainer: {
    padding: 16,
  },
  boxDetailsContainer: {
    paddingHorizontal: 16,
  },
  boxDetailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  boxDetailContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boxDetailInfo: {
    flex: 1,
  },
  boxDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  boxDetailInterval: {
    fontSize: 12,
    color: '#00D4FF',
    marginTop: 2,
  },
  boxDetailStats: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  boxCountContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  boxDetailCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  boxDetailCountLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  boxProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  boxProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#6366F1',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dailyCardsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  dailyCardsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyCardsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dailyCardsText: {
    marginLeft: 12,
  },
  dailyCardsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dailyCardsSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  dueStatValue: {
    color: '#FF6B6B',
  },
  gradientBackground: {
    flex: 1,
  },
}); 