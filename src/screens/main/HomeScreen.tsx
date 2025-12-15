import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { useFocusEffect } from '@react-navigation/native';
import { notificationService } from '../../services/notificationService';
import NotificationBadge from '../../components/NotificationBadge';
import DueCardsNotification from '../../components/DueCardsNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';

interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  subject: {
    subject_name: string;
  };
  flashcard_count?: number;
  topic_count?: number;
}

interface UserData {
  exam_type: string;
  username: string;
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const styles = createStyles(colors, theme);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    subject: UserSubject | null;
  }>({ visible: false, subject: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  
  // Notification and gamification state
  const [cardsDue, setCardsDue] = useState<any>({ total: 0, bySubject: {} });
  const [userStats, setUserStats] = useState({ 
    total_points: 0, 
    current_streak: 0, 
    total_cards_reviewed: 0,
    correct_percentage: 0 
  });
  const [showNotification, setShowNotification] = useState(false);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      // Check if in-app notifications are enabled
      const inAppNotifPref = await AsyncStorage.getItem('inAppNotificationsEnabled');
      const isEnabled = inAppNotifPref === null || inAppNotifPref === 'true'; // Default to true
      setInAppNotificationsEnabled(isEnabled);
      
      // Fetch cards due count
      const dueCount = await notificationService.getCardsDueCount(user.id);
      setCardsDue(dueCount);
      
      // Show notification if there are cards due AND in-app notifications are enabled
      // Only show once per session to avoid annoying users
      if (dueCount.total > 0 && isEnabled) {
        const lastShownKey = `notification_last_shown_${user.id}`;
        const lastShown = await AsyncStorage.getItem(lastShownKey);
        const now = new Date().getTime();
        
        // Show if never shown before OR last shown more than 4 hours ago
        if (!lastShown || (now - parseInt(lastShown)) > (4 * 60 * 60 * 1000)) {
          setTimeout(() => {
            setShowNotification(true);
            AsyncStorage.setItem(lastShownKey, now.toString());
          }, 2000); // Show after 2 second delay (was 1 second)
        }
      }
      
      // Fetch user stats
      const stats = await notificationService.getUserStats(user.id);
      
      // Calculate correct percentage
      let correctPercentage = 0;
      if (stats.total_cards_reviewed > 0) {
        const { data: reviews } = await supabase
          .from('card_reviews')
          .select('was_correct')
          .eq('user_id', user.id);
        
        if (reviews && reviews.length > 0) {
          const correctCount = reviews.filter(r => r.was_correct).length;
          correctPercentage = Math.round((correctCount / reviews.length) * 100);
        }
      }
      
      setUserStats({ ...stats, correct_percentage: correctPercentage });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserData();
      fetchNotifications();
    }, [user?.id])
  );

  const fetchUserData = async () => {
    try {
      // Fetch user data
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('exam_type, username')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      setUserData(userInfo);

      // Fetch user subjects with subject details
      const { data: subjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          exam_board,
          color,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;
      
      // Fetch flashcard counts and topic counts for each subject
      if (subjects && subjects.length > 0) {
        const subjectsWithCounts = await Promise.all(
          subjects.map(async (subject: any) => {
            // Get flashcard count
            const { count: flashcardCount } = await supabase
              .from('flashcards')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id)
              .eq('subject_name', subject.subject.subject_name);
            
            // Get topic count (level 3 topics)
            const { count: topicCount } = await supabase
              .from('curriculum_topics')
              .select('*', { count: 'exact', head: true })
              .eq('exam_board_subject_id', subject.subject_id)
              .eq('topic_level', 3);
            
            return {
              ...subject,
              flashcard_count: flashcardCount || 0,
              topic_count: topicCount || 0
            };
          })
        );
        setUserSubjects(subjectsWithCounts);
      } else {
        // Fix: Ensure subject is object not array
        const fixedSubjects = (subjects || []).map((s: any) => ({
          ...s,
          subject: Array.isArray(s.subject) ? s.subject[0] : s.subject
        }));
        setUserSubjects(fixedSubjects as UserSubject[]);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamTypeDisplay = (examType: string) => {
    const types: { [key: string]: string } = {
      gcse: 'GCSE',
      alevel: 'A-Level',
      btec: 'BTEC / Vocational',
      ib: 'International Baccalaureate',
      igcse: 'iGCSE',
    };
    return types[examType] || examType;
  };

  const handleSubjectPress = (subject: UserSubject) => {
    navigation.navigate('SubjectProgress', { 
      subjectId: subject.subject_id,
      subjectName: subject.subject.subject_name,
      subjectColor: subject.color,
      examBoard: subject.exam_board,
      examType: userData?.exam_type,
    });
  };

  const handleDeleteSubject = async () => {
    if (!deleteModal.subject) return;
    
    setIsDeleting(true);
    try {
      // Delete the user_subject record
      const { error } = await supabase
        .from('user_subjects')
        .delete()
        .eq('user_id', user?.id)
        .eq('id', deleteModal.subject.id);

      if (error) throw error;

      // Refresh the subjects list
      await fetchUserData();
      setDeleteModal({ visible: false, subject: null });
    } catch (error) {
      console.error('Error deleting subject:', error);
      Alert.alert('Error', 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubjectLongPress = (subject: UserSubject) => {
    setDeleteModal({ visible: true, subject });
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={colors.gradient}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.greeting}>Welcome back!</Text>
                <Text style={styles.username}>{userData?.username || 'Student'}</Text>
              </View>
              {userData?.exam_type && (
                <View style={styles.examTypeBadge}>
                  <Text style={styles.examTypeText}>
                    {getExamTypeDisplay(userData.exam_type)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="albums" size={16} color="#FFD700" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.total_cards_reviewed}</Text>
                <Text style={styles.headerStatLabel}>Cards</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="flame" size={16} color="#FF6B6B" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.current_streak}</Text>
                <Text style={styles.headerStatLabel}>Streak</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statIconContainer}>
                  <Icon name="star" size={16} color="#4ECDC4" />
                </View>
                <Text style={styles.headerStatNumber}>{userStats.total_points}</Text>
                <Text style={styles.headerStatLabel}>XP</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <View style={styles.statProgressContainer}>
                  <View style={styles.statProgressBar}>
                    <View 
                      style={[
                        styles.statProgressFill, 
                        { width: `${userStats.correct_percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{userStats.correct_percentage}%</Text>
                </View>
                <Text style={styles.headerStatLabel}>Correct</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Subjects</Text>
          <TouchableOpacity
            style={styles.viewToggle}
            onPress={() => setIsGridView(!isGridView)}
          >
            <Ionicons 
              name={isGridView ? "list" : "grid"} 
              size={20} 
              color="#6366F1" 
            />
          </TouchableOpacity>
        </View>
        {userSubjects.length > 0 ? (
          <>
            <View style={isGridView ? styles.subjectsGridView : styles.subjectsGrid}>
              {userSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={isGridView ? styles.subjectCardGrid : styles.subjectCard}
                  onPress={() => handleSubjectPress(subject)}
                  onLongPress={() => handleSubjectLongPress(subject)}
                >
                  <View style={styles.subjectCardWrapper}>
                    <LinearGradient
                      colors={[subject.color || '#6366F1', adjustColor(subject.color || '#6366F1', -20)]}
                      style={isGridView ? styles.subjectGradientGrid : styles.subjectGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={isGridView ? styles.subjectHeaderGrid : styles.subjectHeader}>
                        <Text style={isGridView ? styles.subjectNameGrid : styles.subjectName} numberOfLines={isGridView ? 2 : 1}>
                          {subject.subject.subject_name}
                        </Text>
                        {!isGridView && (
                          <View style={styles.headerButtons}>
                            <TouchableOpacity
                              style={styles.colorButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                navigation.navigate('ColorPicker', {
                                  subjectId: subject.subject_id,
                                  subjectName: subject.subject.subject_name,
                                  currentColor: subject.color,
                                });
                              }}
                            >
                              <Icon name="color-palette-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleSubjectLongPress(subject);
                              }}
                            >
                              <Icon name="trash-outline" size={20} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Icon name="chevron-forward" size={20} color="#FFFFFF" />
                          </View>
                        )}
                      </View>
                      {!isGridView && (
                        <View style={styles.subjectMeta}>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{subject.exam_board}</Text>
                          </View>
                          <View style={styles.metaBadge}>
                            <Text style={styles.metaText}>{getExamTypeDisplay(userData?.exam_type || '')}</Text>
                          </View>
                        </View>
                      )}
                      <View style={isGridView ? styles.subjectStatsGrid : styles.subjectStats}>
                        <View style={styles.statItem}>
                          <Icon name="albums-outline" size={isGridView ? 14 : 16} color="#FFFFFF" />
                          <Text style={isGridView ? styles.statTextGrid : styles.statText}>{subject.flashcard_count || 0}</Text>
                        </View>
                      </View>
                      {isGridView && (
                        <View style={styles.gridActions}>
                          <TouchableOpacity
                            style={styles.gridActionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              navigation.navigate('ColorPicker', {
                                subjectId: subject.subject_id,
                                subjectName: subject.subject.subject_name,
                                currentColor: subject.color,
                              });
                            }}
                          >
                            <Icon name="color-palette-outline" size={16} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </LinearGradient>
                    {cardsDue.bySubject[subject.subject.subject_name] > 0 && inAppNotificationsEnabled && (
                      <View style={styles.notificationBadgeContainer}>
                        <View style={styles.dueBadge}>
                          <Text style={styles.dueBadgeText}>
                            {cardsDue.bySubject[subject.subject.subject_name]} due
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => {
                if (userData?.exam_type) {
                  navigation.navigate('SubjectSelection', { 
                    examType: userData.exam_type,
                    isAddingSubjects: true 
                  });
                } else {
                  navigation.navigate('ExamTypeSelection');
                }
              }}
            >
              <Icon name="add-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.addMoreText}>Add More Subjects</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="school-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No subjects added yet</Text>
            <TouchableOpacity
              style={styles.addSubjectButton}
              onPress={() => {
                if (userData?.exam_type) {
                  navigation.navigate('SubjectSelection', { 
                    examType: userData.exam_type,
                    isAddingSubjects: true 
                  });
                } else {
                  // If no exam type, go to exam type selection first
                  navigation.navigate('ExamTypeSelection');
                }
              }}
            >
              <Text style={styles.addSubjectText}>Add Subjects</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CardSubjectSelector')}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="add-circle" size={24} color="#34C759" />
            </View>
            <Text style={styles.actionText}>Create Card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CardSubjectSelector', { 
              mode: 'image' 
            })}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="camera" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionText}>Scan Image</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionCard,
              userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0) === 0 && styles.actionCardDisabled
            ]}
            onPress={() => {
              const totalCards = userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0);
              if (totalCards > 0) {
                navigation.navigate('ManageAllCards');
              }
            }}
            disabled={userSubjects.reduce((sum, s) => sum + (s.flashcard_count || 0), 0) === 0}
          >
            <View style={styles.actionIconContainer}>
              <Icon name="settings-outline" size={24} color="#FF9500" />
            </View>
            <Text style={styles.actionText}>Manage Cards</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <DeleteConfirmationModal
        visible={deleteModal.visible}
        onClose={() => setDeleteModal({ visible: false, subject: null })}
        onConfirm={handleDeleteSubject}
        itemType="Subject"
        itemName={deleteModal.subject?.subject.subject_name || ''}
        isDeleting={isDeleting}
        warningMessage="All flashcards and progress for this subject will be permanently deleted."
      />
      
      <DueCardsNotification
        cardsDue={cardsDue.total}
        visible={showNotification && cardsDue.total > 0 && inAppNotificationsEnabled}
        onPress={() => {
          setShowNotification(false);
          navigation.navigate('Study', { openDailyCards: true });
        }}
        onDismiss={() => setShowNotification(false)}
      />
    </SafeAreaView>
  );
}

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const createStyles = (colors: any, theme: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'cyber' ? colors.background : '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 245, 255, 0.3)',
  },
  header: {
    marginBottom: 10,
  },
  greeting: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  username: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  examTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  examTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme === 'cyber' ? colors.text : '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
    marginTop: 20,
    ...(theme === 'cyber' && {
      textShadowColor: colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 4,
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  viewToggle: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectsGrid: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  subjectsGridView: {
    paddingHorizontal: 20,
    marginBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  subjectCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    ...Platform.select({
      web: {
        // Web: Enhanced border glow
        borderWidth: 2,
        borderColor: 'rgba(0, 245, 255, 0.5)',
      },
      default: {
        // Mobile: Proper shadow glow
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      }
    }),
  },
  subjectCardGrid: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    width: '48%',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: 'rgba(0, 245, 255, 0.5)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
      }
    }),
  },
  subjectGradient: {
    padding: 20,
  },
  subjectGradientGrid: {
    padding: 16,
    height: 140,
    justifyContent: 'space-between',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectHeaderGrid: {
    marginBottom: 8,
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  subjectNameGrid: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  examBoard: {
    fontSize: 14,
    color: '#6B7280',
  },
  subjectMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subjectStats: {
    flexDirection: 'row',
    gap: 16,
  },
  subjectStatsGrid: {
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  statTextGrid: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: colors.border,
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
      }
    }),
  },
  actionCardDisabled: {
    opacity: 0.4,
  },
  actionText: {
    marginTop: 8,
    fontSize: 12,
    color: theme === 'cyber' ? colors.text : '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  addSubjectButton: {
    marginTop: 15,
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  addSubjectText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addMoreButton: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addMoreText: {
    color: '#6366F1',
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  subjectCardWrapper: {
    position: 'relative',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  headerStatItem: {
    alignItems: 'center',
    minWidth: 50,
    paddingHorizontal: 2,
  },
  headerStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  headerStatLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 1,
  },
  headerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  notificationBadgeContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  dueBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dueBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statProgressContainer: {
    width: 50,
    alignItems: 'center',
  },
  statProgressBar: {
    height: 12,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 2,
  },
  statProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  percentageText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    top: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridActions: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridActionButton: {
    padding: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
}); 