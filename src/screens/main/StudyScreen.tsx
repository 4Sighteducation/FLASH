import React, { useState, useEffect, useCallback } from 'react';
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
import StudyBoxModal from '../../components/StudyBoxModal';
import DailyCardsModal from '../../components/DailyCardsModal';
import StudySubjectAccordion from '../../components/StudySubjectAccordion';
import { UserSubjectWithName } from '../../types/database';
import { debugCards } from '../../utils/debugCards';

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

export default function StudyScreen({ route }: any) {
  const navigation = useNavigation();
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
  const [showDailyCards, setShowDailyCards] = useState(false);
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
    
    // Open daily cards if navigated from notification
    if (route?.params?.openDailyCards && dailyCardCount > 0) {
      setShowDailyCards(true);
    }
  }, [route?.params?.openDailyCards]);

  // Open daily cards when count changes and param is set
  useEffect(() => {
    if (route?.params?.openDailyCards && dailyCardCount > 0) {
      setShowDailyCards(true);
    }
  }, [dailyCardCount, route?.params?.openDailyCards]);

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
      const now = new Date(); // Use current time instead of midnight
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

  const handleCloseDailyModal = () => {
    setShowDailyCards(false);
    fetchBoxStats();
    fetchDailyCardCount();
  };

  const navigateToCardBank = () => {
    navigation.navigate('Home' as never);
  };

  const handleSubjectStudy = (subjectName: string, subjectColor: string, boxNumber?: number) => {
    setStudyFilters({ subject: subjectName, color: subjectColor });
    setShowAccordion(false);
    // If no box number specified, we're studying all boxes for this subject
    if (!boxNumber) {
      setSelectedBox(null);
    }
  };

  const handleTopicStudy = (subjectName: string, topicName: string, subjectColor: string, boxNumber?: number) => {
    setStudyFilters({ subject: subjectName, topic: topicName, color: subjectColor });
    setShowAccordion(false);
    // If no box number specified, we're studying all boxes for this topic
    if (!boxNumber) {
      setSelectedBox(null);
    }
  };

  const getBoxInfo = (boxNumber: number): { title: string; description: string; reviewInterval: string } => {
    const boxInfo = {
      1: {
        title: 'Tomorrow\'s Review',
        description: 'Cards you got wrong. Review these tomorrow after you\'ve had time to study.',
        reviewInterval: 'Review: Tomorrow',
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Study Mode</Text>
          <Text style={styles.headerSubtitle}>
            {boxStats.totalInStudyBank} cards in study bank • {boxStats.totalDue} due for review
          </Text>
        </View>

        {/* Daily Cards Section */}
        {dailyCardCount > 0 && (
          <TouchableOpacity 
            style={styles.dailyCardsCard}
            onPress={() => setShowDailyCards(true)}
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
            
            return (
              <TouchableOpacity
                key={boxNumber}
                style={styles.boxDetailCard}
                onPress={() => handleBoxPress(boxNumber)}
              >
                <View style={styles.boxDetailHeader}>
                  <View style={styles.boxDetailLeft}>
                    <Text style={styles.boxDetailTitle}>Box {boxNumber}: {info.title}</Text>
                    <Text style={styles.boxDetailInterval}>{info.reviewInterval}</Text>
                  </View>
                  <View style={styles.boxDetailRight}>
                    <Text style={styles.boxDetailCount}>{count}</Text>
                    <Text style={styles.boxDetailCountLabel}>cards</Text>
                  </View>
                </View>
                <Text style={styles.boxDetailDescription}>{info.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Card Bank Link */}
        <TouchableOpacity style={styles.cardBankButton} onPress={navigateToCardBank}>
          <Ionicons name="albums-outline" size={24} color="#6366F1" />
          <Text style={styles.cardBankButtonText}>Go to Card Bank</Text>
          <Ionicons name="chevron-forward" size={20} color="#6366F1" />
        </TouchableOpacity>

        {/* Empty State */}
        {boxStats.totalInStudyBank === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Cards in Study Bank</Text>
            <Text style={styles.emptySubtitle}>
              Add cards from your Card Bank to start studying with spaced repetition
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={navigateToCardBank}>
              <Text style={styles.emptyButtonText}>Browse Card Bank</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Study Box Modal - Shows cards when subject/topic selected */}
      {selectedBox !== null && !showAccordion && (
        <StudyBoxModal
          visible={true}
          boxNumber={selectedBox}
          onClose={handleCloseBoxModal}
          subjectFilter={studyFilters.subject}
          topicFilter={studyFilters.topic}
          subjectColor={studyFilters.color}
        />
      )}

      {/* Daily Cards Modal */}
      {showDailyCards && (
        <DailyCardsModal
          visible={true}
          onClose={handleCloseDailyModal}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  dailyCardsCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0E0',
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
    color: '#1a1a1a',
  },
  dailyCardsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  boxesContainer: {
    padding: 16,
  },
  boxDetailsContainer: {
    paddingHorizontal: 16,
  },
  boxDetailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  boxDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  boxDetailLeft: {
    flex: 1,
  },
  boxDetailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  boxDetailInterval: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 2,
  },
  boxDetailRight: {
    alignItems: 'center',
  },
  boxDetailCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  boxDetailCountLabel: {
    fontSize: 12,
    color: '#666',
  },
  boxDetailDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cardBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  cardBankButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginHorizontal: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
}); 