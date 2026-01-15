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
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  subject: {
    subject_name: string;
    qualification_types?: { code?: string | null } | null;
  };
}

export default function CardSubjectSelector() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { tier, limits } = useSubscription();
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  
  // Get mode from route params (if 'image', we'll navigate to image generator)
  const mode = (route.params as any)?.mode;

  useEffect(() => {
    fetchUserSubjects();
  }, []);

  const fetchUserSubjects = async () => {
    try {
      // Fetch user data
      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('exam_type')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      setUserData(userInfo);

      // Fetch user subjects
      const { data: subjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          exam_board,
          color,
          subject:exam_board_subjects!subject_id(subject_name, qualification_types(code))
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;
      setUserSubjects(subjects || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectPress = (subject: UserSubject) => {
    // Navigate to SMART topic discovery (uses vector search!)
    navigation.navigate('SmartTopicDiscovery' as never, {
      subjectId: subject.subject_id,
      subjectName: subject.subject.subject_name,
      subjectColor: subject.color,
      examBoard: subject.exam_board,
      // Use subject qualification for correct search + AI generation difficulty in mixed-track scenarios.
      examType: subject.subject?.qualification_types?.code || userData?.exam_type,
      mode: mode,
    } as never);
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
        colors={['#6366F1', '#8B5CF6']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Subject</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Choose a subject to create cards for:</Text>
        
        {userSubjects.length > 0 ? (
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
                  <Text style={styles.examBoard}>{subject.exam_board}</Text>
                </View>
                <Icon name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="school-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No subjects added yet</Text>
            <TouchableOpacity
              style={styles.addSubjectButton}
              onPress={() => {
                if (tier === 'free' && limits.maxSubjects !== -1 && userSubjects.length >= limits.maxSubjects) {
                  showUpgradePrompt({
                    message: 'The Free plan is limited to 1 subject. Keep studying like a Pro for unlimited subjects.',
                    navigation,
                  });
                  return;
                }
                navigation.navigate('SubjectSelection' as never, {
                  // Keep subject adding flow driven by the user's track(s); per-subject qualification is derived from chosen subject.
                  examType: userData?.exam_type,
                  isAddingSubjects: true,
                } as never);
              }}
            >
              <Text style={styles.addSubjectText}>Add Subjects</Text>
            </TouchableOpacity>
          </View>
        )}
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
  },
  subjectsGrid: {
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
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
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
}); 