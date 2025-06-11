import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';

interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  subject: {
    subject_name: string;
  };
  flashcard_count?: number;
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

  useEffect(() => {
    fetchUserData();
  }, []);

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
      
      // Fetch flashcard counts for each subject
      if (subjects && subjects.length > 0) {
        const subjectsWithCounts = await Promise.all(
          subjects.map(async (subject: any) => {
            const { count } = await supabase
              .from('flashcards')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user?.id)
              .eq('subject_name', subject.subject.subject_name);
            
            return {
              ...subject,
              flashcard_count: count || 0
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
    navigation.navigate('Flashcards', { 
      subjectName: subject.subject.subject_name,
      subjectColor: subject.color,
      examBoard: subject.exam_board,
      examType: userData?.exam_type,
    });
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
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.username}>{userData?.username || 'Student'}</Text>
            {userData?.exam_type && (
              <View style={styles.examTypeBadge}>
                <Text style={styles.examTypeText}>
                  {getExamTypeDisplay(userData.exam_type)}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Cards Studied</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Subjects</Text>
        {userSubjects.length > 0 ? (
          <>
            <View style={styles.subjectsGrid}>
              {userSubjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectCard,
                    { borderLeftColor: subject.color || '#6366F1' }
                  ]}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <View style={styles.subjectContent}>
                    <Text style={styles.subjectName}>{subject.subject.subject_name}</Text>
                    <View style={styles.subjectMeta}>
                      <Text style={styles.examBoard}>{subject.exam_board}</Text>
                      {subject.flashcard_count !== undefined && subject.flashcard_count > 0 && (
                        <View style={styles.cardCountBadge}>
                          <Ionicons name="albums-outline" size={14} color="#6366F1" />
                          <Text style={styles.cardCount}>{subject.flashcard_count} cards</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => {
                if (userData?.exam_type) {
                  navigation.navigate('SubjectSelection', { examType: userData.exam_type });
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
                  navigation.navigate('SubjectSelection', { examType: userData.exam_type });
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
            onPress={() => navigation.navigate('CreateCard')}
          >
            <Ionicons name="add-circle-outline" size={32} color="#34C759" />
            <Text style={styles.actionText}>Create Card</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  examBoard: {
    fontSize: 14,
    color: '#6B7280',
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cardCount: {
    color: '#6366F1',
    fontSize: 12,
    fontWeight: '600',
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
}); 