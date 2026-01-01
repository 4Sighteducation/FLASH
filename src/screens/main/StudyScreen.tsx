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
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useNavigation } from '@react-navigation/native';
import LeitnerBoxes from '../../components/LeitnerBoxes';
import StudySubjectAccordion from '../../components/StudySubjectAccordion';
import StudyWizard from '../../components/StudyWizard';
import { UserSubjectWithName } from '../../types/database';
import { debugCards } from '../../utils/debugCards';
import { LeitnerSystem } from '../../utils/leitnerSystem';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const { colors, theme } = useTheme();
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
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    fetchBoxStats();
    fetchDailyCardCount();
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasSeenWizard = await AsyncStorage.getItem('hasSeenStudyWizard');
      if (!hasSeenWizard) {
        // Show wizard after a short delay for better UX
        setTimeout(() => setShowWizard(true), 1000);
      }
    } catch (error) {
      console.error('Error checking wizard status:', error);
    }
  };

  const handleWizardClose = async () => {
    setShowWizard(false);
    try {
      await AsyncStorage.setItem('hasSeenStudyWizard', 'true');
    } catch (error) {
      console.error('Error saving wizard status:', error);
    }
  };

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

  const getBoxInfo = (boxNumber: number) => {
    return LeitnerSystem.getBoxInfo(boxNumber);
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
    <SafeAreaView style={[styles.container, theme !== 'default' && { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={theme !== 'default' ? colors.gradient : ['#1a1f3a', '#2d3561']}
        style={styles.gradientBackground}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header - Simplified */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Icon name="school" size={28} color={theme !== 'default' ? colors.primary : "#00D4FF"} />
              <Text style={styles.headerTitle}>Study Hub</Text>
            </View>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => setShowWizard(true)}
            >
              <Icon name="help-circle-outline" size={24} color="#00D4FF" />
            </TouchableOpacity>
          </View>

          {/* HERO: Daily Review CTA - HUGE and PROMINENT */}
          {dailyCardCount > 0 ? (
            <View style={styles.heroSection}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.heroGradient}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroIcon}>
                    <Icon name="flame" size={48} color="#fff" />
                  </View>
                  <Text style={styles.heroTitle}>Ready to Study?</Text>
                  <Text style={styles.heroCardCount}>{dailyCardCount} cards due today</Text>
                  <Text style={styles.heroSubtitle}>
                    Complete today to keep your streak! 🔥
                  </Text>
                  
                  <TouchableOpacity 
                    style={styles.heroButton}
                    onPress={handleDailyCardsPress}
                  >
                    <Text style={styles.heroButtonText}>START REVIEW</Text>
                    <Icon name="arrow-forward" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.heroSection}>
              <View style={styles.heroDoneCard}>
                <Icon name="checkmark-circle" size={64} color="#4CAF50" />
                <Text style={styles.heroDoneTitle}>All Caught Up! 🎉</Text>
                <Text style={styles.heroDoneText}>
                  No cards due right now. Great job!
                </Text>
                <Text style={styles.heroDoneHint}>
                  Cards: {boxStats.totalInStudyBank} • Next review coming soon
                </Text>
              </View>
            </View>
          )}

          {/* Quick Stats */}
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{boxStats.totalInStudyBank}</Text>
              <Text style={styles.quickStatLabel}>Total Cards</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatValue, styles.dueStatValue]}>{boxStats.totalDue}</Text>
              <Text style={styles.quickStatLabel}>Due Now</Text>
            </View>
          </View>

          {/* Learning Journey - Simplified Visual */}
          <View style={styles.journeySection}>
            <Text style={styles.sectionTitle}>Your Learning Journey</Text>
            
            {/* Progress Bar Visual */}
            <View style={styles.journeyBar}>
              {[1, 2, 3, 4, 5].map((boxNumber) => {
                const info = getBoxInfo(boxNumber);
                const count = boxStats[`box${boxNumber}` as keyof BoxStats] as number;
                const isActive = count > 0;
                
                return (
                  <TouchableOpacity
                    key={boxNumber}
                    style={[styles.journeyStep, isActive && styles.journeyStepActive]}
                    onPress={() => count > 0 && handleBoxPress(boxNumber)}
                    disabled={count === 0}
                  >
                    <Text style={styles.journeyEmoji}>{info.emoji}</Text>
                    <Text style={styles.journeyCount}>{count}</Text>
                    <Text style={styles.journeyLabel}>{info.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <Text style={styles.journeyHint}>
              Tap a stage to study those cards
            </Text>
          </View>

          {/* Study Options - Collapsible */}
          <View style={styles.optionsSection}>
            <TouchableOpacity 
              style={styles.optionsHeader}
              onPress={() => setShowAccordion(!showAccordion)}
            >
              <View style={styles.optionsHeaderLeft}>
                <Icon name="list" size={24} color={theme !== 'default' ? colors.primary : "#00D4FF"} />
                <Text style={styles.optionsTitle}>Study by Subject or Topic</Text>
              </View>
              <Icon 
                name={showAccordion ? "chevron-up" : "chevron-down"} 
                size={24} 
                color={theme !== 'default' ? colors.textSecondary : "#999"} 
              />
            </TouchableOpacity>
            
            {showAccordion && (
              <Modal
                visible={true}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={handleCloseBoxModal}
              >
                <SafeAreaView style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={handleCloseBoxModal} style={styles.modalCloseButton}>
                      <Icon name="close" size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>
                      {selectedBox !== null
                        ? `${LeitnerSystem.getBoxDisplayName(selectedBox)} - Select Subject`
                        : 'Select a stage to study'}
                    </Text>
                    <View style={{ width: 28 }} />
                  </View>
                  {selectedBox === null ? (
                    <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
                      <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>
                        Choose which stage you want to study, then pick a subject or topic.
                      </Text>
                      {[1, 2, 3, 4, 5].map((boxNumber) => {
                        const info = getBoxInfo(boxNumber);
                        const count = boxStats[`box${boxNumber}` as keyof BoxStats] as number;
                        return (
                          <TouchableOpacity
                            key={boxNumber}
                            style={[
                              styles.boxListCard,
                              { marginBottom: 12, opacity: count === 0 ? 0.5 : 1 },
                            ]}
                            onPress={() => count > 0 && setSelectedBox(boxNumber)}
                            disabled={count === 0}
                          >
                            <View style={styles.boxListContent}>
                              <View style={styles.boxListTop}>
                                <Text style={styles.boxListName}>
                                  {info.name} {info.emoji}
                                </Text>
                                <Text style={styles.boxListCount}>{count} cards</Text>
                              </View>
                              <Text style={styles.boxListInterval}>Review: {info.displayInterval}</Text>
                            </View>
                            {count > 0 && (
                              <Icon name="chevron-forward" size={20} color="#999" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <StudySubjectAccordion
                      boxNumber={selectedBox}
                      onSubjectStudy={handleSubjectStudy}
                      onTopicStudy={handleTopicStudy}
                    />
                  )}
                </SafeAreaView>
              </Modal>
            )}
          </View>

          {/* Box Details - Compact Expandable List */}
          <View style={styles.boxListSection}>
            {[1, 2, 3, 4, 5].map((boxNumber) => {
              const info = getBoxInfo(boxNumber);
              const count = boxStats[`box${boxNumber}` as keyof BoxStats] as number;
              
              const boxColors = {
                1: '#FF6B6B',
                2: '#4ECDC4',
                3: '#45B7D1',
                4: '#96CEB4',
                5: '#DDA0DD',
              };
              
              const color = boxColors[boxNumber as keyof typeof boxColors];
              
              return (
                <TouchableOpacity
                  key={boxNumber}
                  style={styles.boxListCard}
                  onPress={() => handleBoxPress(boxNumber)}
                  disabled={count === 0}
                >
                  <View style={[styles.boxListIndicator, { backgroundColor: color }]} />
                  <View style={styles.boxListContent}>
                    <View style={styles.boxListTop}>
                      <Text style={styles.boxListName}>
                        {info.name} {info.emoji}
                      </Text>
                      <Text style={styles.boxListCount}>{count} cards</Text>
                    </View>
                    <Text style={styles.boxListInterval}>Review: {info.displayInterval}</Text>
                  </View>
                  {count > 0 && (
                    <Icon name="chevron-forward" size={20} color="#999" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* First-Time Wizard */}
      <StudyWizard visible={showWizard} onClose={handleWizardClose} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  helpButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 20,
  },
  
  // HERO SECTION - Daily Review CTA
  heroSection: {
    margin: 20,
    marginBottom: 16,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    alignItems: 'center',
    width: '100%',
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroCardCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 24,
    textAlign: 'center',
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    letterSpacing: 1,
  },
  
  // All Caught Up State
  heroDoneCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  heroDoneTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  heroDoneText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  heroDoneHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 12,
  },
  
  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  quickStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dueStatValue: {
    color: '#FF6B6B',
  },
  
  // Learning Journey
  journeySection: {
    margin: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  journeyBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
  },
  journeyStep: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    opacity: 0.5,
  },
  journeyStepActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 1,
  },
  journeyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  journeyCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  journeyLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  journeyHint: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 12,
  },
  
  // Study Options
  optionsSection: {
    margin: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Box List - Compact
  boxListSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  boxListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  boxListIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
  },
  boxListContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 20,
  },
  boxListTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boxListName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  boxListCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4FF',
  },
  boxListInterval: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  
  // Modal
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
  
  gradientBackground: {
    flex: 1,
  },
}); 