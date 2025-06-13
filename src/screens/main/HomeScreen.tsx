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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { useFocusEffect } from '@react-navigation/native';
import { notificationService } from '../../services/notificationService';
import NotificationBadge from '../../components/NotificationBadge';
import DueCardsNotification from '../../components/DueCardsNotification';

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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    subject: UserSubject | null;
  }>({ visible: false, subject: null });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Notification and gamification state
  const [cardsDue, setCardsDue] = useState<any>({ total: 0, bySubject: {} });
  const [userStats, setUserStats] = useState({ 
    total_points: 0, 
    current_streak: 0, 
    total_cards_reviewed: 0 
  });
  const [showNotification, setShowNotification] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch cards due count
      const dueCount = await notificationService.getCardsDueCount(user.id);
      setCardsDue(dueCount);
      
      // Show notification if there are cards due
      if (dueCount.total > 0) {
        setTimeout(() => setShowNotification(true), 1000); // Show after a delay
      }
      
      // Fetch user stats
      const stats = await notificationService.getUserStats(user.id);
      setUserStats(stats);
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
        setUserSubjects(subjects || []);
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
    navigation.navigate('TopicList', { 
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
          colors={['#6366F1', '#8B5CF6']}
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
                <Text style={styles.headerStatNumber}>{userStats.total_cards_reviewed}</Text>
                <Text style={styles.headerStatLabel}>Cards</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{userStats.current_streak}</Text>
                <Text style={styles.headerStatLabel}>Streak</Text>
              </View>
              <View style={styles.headerStatDivider} />
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{userStats.total_points}</Text>
                <Text style={styles.headerStatLabel}>XP</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Your Subjects</Text>
        {userSubjects.length > 0 ? (
          <>
            <View style={styles.subjectsGrid}>
              {userSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectCard}
                  onPress={() => handleSubjectPress(subject)}
                  onLongPress={() => handleSubjectLongPress(subject)}
                >
                  <View style={styles.subjectCardWrapper}>
                    <LinearGradient
                      colors={[subject.color || '#6366F1', adjustColor(subject.color || '#6366F1', -20)]}
                      style={styles.subjectGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.subjectHeader}>
                        <Text style={styles.subjectName}>{subject.subject.subject_name}</Text>
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
                          <Ionicons name="color-palette-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSubjectLongPress(subject);
                          }}
                        >
                          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                      </View>
                    </View>
                    <View style={styles.subjectMeta}>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaText}>{subject.exam_board}</Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaText}>{getExamTypeDisplay(userData?.exam_type || '')}</Text>
                      </View>
                    </View>
                    <View style={styles.subjectStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="list-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.statText}>{subject.topic_count || 0} sub-topics</Text>
                      </View>
                      {subject.flashcard_count !== undefined && subject.flashcard_count > 0 && (
                        <View style={styles.statItem}>
                          <Ionicons name="albums-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.statText}>{subject.flashcard_count} cards</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                    {cardsDue.bySubject[subject.subject.subject_name] > 0 && (
                      <NotificationBadge 
                        count={cardsDue.bySubject[subject.subject.subject_name]} 
                        size="medium" 
                      />
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
              <Ionicons name="add-circle-outline" size={20} color="#6366F1" />
              <Text style={styles.addMoreText}>Add More Subjects</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={48} color="#ccc" />
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
            onPress={() => navigation.navigate('Study')}
          >
            <Ionicons name="play-circle-outline" size={32} color="#FF9500" />
            <Text style={styles.actionText}>Study Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CardSubjectSelector')}
          >
            <Ionicons name="add-circle-outline" size={32} color="#34C759" />
            <Text style={styles.actionText}>Create Card</Text>
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
        visible={showNotification && cardsDue.total > 0}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
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
    marginBottom: -10,
  },
  header: {
    marginBottom: 10,
  },
  greeting: {
    fontSize: 24,
    color: '#E0E7FF',
  },
  username: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  subjectsGrid: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  subjectCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  subjectGradient: {
    padding: 20,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    marginTop: 10,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerStatItem: {
    alignItems: 'center',
  },
  headerStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
}); 