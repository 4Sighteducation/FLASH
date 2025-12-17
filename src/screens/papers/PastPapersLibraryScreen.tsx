import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import PastPapersTutorial from '../../components/PastPapersTutorial';
import QualityTierInfo from '../../components/QualityTierInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  gradient_color_1?: string;
  gradient_color_2?: string;
  use_gradient?: boolean;
  subject: {
    subject_name: string;
  };
  paper_count?: number;
  has_verified?: number;
  has_official?: number;
  has_ai?: number;
  staging_subject_id?: string;
}

const adjustColor = (color: string, amount: number): string => {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export default function PastPapersLibraryScreen({ navigation }: any) {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showQualityInfo, setShowQualityInfo] = useState(false);

  // Defense-in-depth: if user reaches this screen via deep navigation, still gate to Pro.
  useEffect(() => {
    if (tier !== 'pro') {
      showUpgradePrompt({
        title: 'Pro feature',
        message: 'Past Papers are available on Pro. Upgrade to unlock real exam questions with AI marking.',
        navigation,
      });
      // Send them back to a safe tab (Profile) so they don't sit on a locked page.
      navigation.navigate('Profile' as never);
    }
  }, [tier, navigation]);

  const checkExtractionNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Show completion alerts for any completed extractions the user hasn't acknowledged yet.
      // We intentionally do NOT depend on DB columns like `notified` because Supabase schema cache
      // can lag; we use AsyncStorage to avoid repeat alerts.
      const { data, error } = await supabase
        .from('paper_extraction_status')
        .select('id, paper_id, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      const row = data?.[0];
      if (!row) return;

      const storageKey = 'papers_extraction_notified_ids_v1';
      const raw = await AsyncStorage.getItem(storageKey);
      const notifiedIds = new Set<string>(raw ? JSON.parse(raw) : []);
      if (notifiedIds.has(row.id)) return;

      Alert.alert(
        'Paper Ready ✅',
        'Your paper extraction has completed. You can now open it from Past Papers and start practicing.',
        [
          {
            text: 'OK',
            onPress: async () => {
              notifiedIds.add(row.id);
              await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(notifiedIds)));
            },
          },
        ]
      );
    } catch (e) {
      // If columns don't exist yet or RLS blocks, don't crash the library screen.
      console.warn('[Papers] extraction notification check skipped:', e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubjectsWithPapers();
    checkTutorialStatus();
  }, []);

  // In-app notification when user returns to Papers tab
  useFocusEffect(
    useCallback(() => {
      checkExtractionNotifications();
    }, [checkExtractionNotifications])
  );

  const checkTutorialStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('past_papers_tutorial_seen');
      if (!seen) {
        setShowTutorial(true);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  };

  const completeTutorial = async () => {
    setShowTutorial(false);
    try {
      await AsyncStorage.setItem('past_papers_tutorial_seen', 'true');
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  const loadSubjectsWithPapers = async () => {
    if (!user?.id) return;

    try {
      console.log('[Papers] Loading subjects for user:', user.id);

      const normalize = (s: string | null | undefined) =>
        (s || '')
          .toString()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
      
      // Get user's subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          exam_board,
          color,
          gradient_color_1,
          gradient_color_2,
          use_gradient,
          subject:exam_board_subjects!subject_id(subject_name, exam_board_id)
        `)
        .eq('user_id', user.id);

      if (subjectsError) throw subjectsError;
      
      console.log('[Papers] User subjects:', userSubjects?.length);

      // For each subject, find matching staging subject and count papers
      const subjectsWithPapers = await Promise.all(
        (userSubjects || []).map(async (subject: any) => {
          console.log('[Papers] Processing subject:', subject.subject.subject_name);
          
          // Get the exam board subject details WITH qualification type
          const { data: ebSubject } = await supabase
            .from('exam_board_subjects')
            .select(`
              subject_code,
              exam_board_id,
              qualification_type:qualification_types!qualification_type_id(code)
            `)
            .eq('id', subject.subject_id)
            .single();

          console.log('[Papers] Exam board subject:', ebSubject);

          if (!ebSubject) {
            console.log('[Papers] No exam board subject found');
            return { ...subject, paper_count: 0 };
          }

          const qualificationCode = Array.isArray((ebSubject as any).qualification_type)
            ? (ebSubject as any).qualification_type?.[0]?.code
            : (ebSubject as any).qualification_type?.code;

          // Get exam board code
          const { data: examBoard } = await supabase
            .from('exam_boards')
            .select('code')
            .eq('id', ebSubject.exam_board_id)
            .single();

          const examBoardCode = (examBoard as any)?.code;
          console.log('[Papers] Exam board code:', examBoardCode);
          console.log('[Papers] Looking for staging subject with:', {
            subject_code: ebSubject.subject_code,
            qual_type: qualificationCode,
            exam_board: examBoardCode
          });

          // Find matching staging subject
          // NOTE: qualification_type formatting differs across sources (e.g. "A Level" vs "A-Level").
          // So we fetch candidates by subject_code + exam_board, then match qualification client-side.
          const { data: stagingCandidates } = await supabase
            .from('staging_aqa_subjects')
            .select('id, subject_name, subject_code, qualification_type, exam_board')
            .eq('subject_code', ebSubject.subject_code)
            .eq('exam_board', examBoardCode || subject.exam_board)
            .limit(10);

          const wantedQual = normalize(qualificationCode);
          let stagingSubject: any =
            (stagingCandidates || []).find((s: any) => normalize(s.qualification_type) === wantedQual) ||
            (stagingCandidates || [])[0] ||
            null;

          // Fallback: if no candidates by subject_code, try fuzzy match by subject name for that exam board.
          if (!stagingSubject) {
            const prodName = normalize(subject.subject.subject_name);
            const { data: nameCandidates } = await supabase
              .from('staging_aqa_subjects')
              .select('id, subject_name, subject_code, qualification_type, exam_board')
              .eq('exam_board', examBoardCode || subject.exam_board)
              .limit(50);

            stagingSubject =
              (nameCandidates || []).find((s: any) => {
                const name = normalize(s.subject_name);
                return name && prodName && (name.includes(prodName) || prodName.includes(name));
              }) || null;
          }

          console.log('[Papers] Staging subject match:', stagingSubject);

          if (!stagingSubject) {
            console.log('[Papers] No staging subject found for:', {
              subject_code: ebSubject.subject_code,
              qual_type: qualificationCode,
              exam_board: examBoardCode || subject.exam_board,
              candidate_count: (stagingCandidates || []).length,
            });
            return { ...subject, paper_count: 0 };
          }

          // Count papers in staging for this subject
          const { count: paperCount } = await supabase
            .from('staging_aqa_exam_papers')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', stagingSubject.id)
            .gte('year', 2000)
            .lte('year', 2030)
            .not('paper_number', 'eq', -1);

          // Count by quality tier
          const { data: papers } = await supabase
            .from('staging_aqa_exam_papers')
            .select('question_paper_url, mark_scheme_url, examiner_report_url')
            .eq('subject_id', stagingSubject.id)
            .gte('year', 2000)
            .lte('year', 2030)
            .not('paper_number', 'eq', -1);

          const qualityCounts = (papers || []).reduce((acc, p) => {
            if (p.examiner_report_url) acc.verified++;
            else if (p.mark_scheme_url) acc.official++;
            else acc.ai++;
            return acc;
          }, { verified: 0, official: 0, ai: 0 });

          return {
            ...subject,
            paper_count: paperCount || 0,
            has_verified: qualityCounts.verified,
            has_official: qualityCounts.official,
            has_ai: qualityCounts.ai,
            staging_subject_id: stagingSubject.id, // Store for paper detail screen
          };
        })
      );

      // Filter out subjects with no papers
      const subjectsWithAvailablePapers = subjectsWithPapers.filter(s => s.paper_count > 0);

      setSubjects(subjectsWithAvailablePapers);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00F5FF" />
          <Text style={styles.loadingText}>Loading past papers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={['#1a1a2e', '#0f0f1e']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Past Papers</Text>
              <Text style={styles.headerSubtitle}>
                Practice with real exam questions
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => setShowTutorial(true)}
            >
              <Icon name="help-circle" size={28} color="#6366F1" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Info Card - Clickable */}
        <TouchableOpacity 
          style={styles.infoCard}
          onPress={() => setShowQualityInfo(true)}
        >
          <Icon name="information-circle" size={20} color="#00F5FF" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Quality Tiers</Text>
            <Text style={styles.infoDescription}>
              ✅ Verified • ⭐ Official • 🤖 AI-Assisted
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#00F5FF" />
        </TouchableOpacity>

        {/* Subjects with Papers */}
        {subjects.length > 0 ? (
          <View style={styles.subjectsContainer}>
            <Text style={styles.sectionTitle}>Your Subjects</Text>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                style={styles.subjectCard}
                onPress={() =>
                  navigation.navigate('PaperDetail', {
                    stagingSubjectId: subject.staging_subject_id,
                    subjectName: subject.subject.subject_name,
                    examBoard: subject.exam_board,
                    subjectColor: subject.color,
                  })
                }
              >
                <LinearGradient
                  colors={
                    subject.use_gradient && subject.gradient_color_1 && subject.gradient_color_2
                      ? [subject.gradient_color_1, subject.gradient_color_2]
                      : [subject.color || '#6366F1', adjustColor(subject.color || '#6366F1', -20)]
                  }
                  style={styles.subjectGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.subjectHeader}>
                    <View>
                      <Text style={styles.subjectName}>{subject.subject.subject_name}</Text>
                      <Text style={styles.examBoard}>{subject.exam_board}</Text>
                    </View>
                    <Icon name="chevron-forward" size={24} color="#FFFFFF" />
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Icon name="document-text" size={16} color="#FFFFFF" />
                      <Text style={styles.statText}>{subject.paper_count} papers</Text>
                    </View>
                  </View>

                  {/* Quality breakdown */}
                  <View style={styles.qualityRow}>
                    {(subject.has_verified || 0) > 0 && (
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityBadgeText}>
                          ✅ {subject.has_verified}
                        </Text>
                      </View>
                    )}
                    {(subject.has_official || 0) > 0 && (
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityBadgeText}>
                          ⭐ {subject.has_official}
                        </Text>
                      </View>
                    )}
                    {(subject.has_ai || 0) > 0 && (
                      <View style={styles.qualityBadge}>
                        <Text style={styles.qualityBadgeText}>
                          🤖 {subject.has_ai}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Icon name="document-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No past papers available</Text>
            <Text style={styles.emptySubtext}>
              Add subjects that have past papers available
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Tutorial Modal */}
      <PastPapersTutorial
        visible={showTutorial}
        onComplete={completeTutorial}
      />

      {/* Quality Tier Info Modal */}
      <QualityTierInfo
        visible={showQualityInfo}
        onClose={() => setShowQualityInfo(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  helpButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00F5FF',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  subjectsContainer: {
    paddingHorizontal: 20,
  },
  subjectCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: 'rgba(0, 245, 255, 0.3)',
      },
      default: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  subjectGradient: {
    padding: 20,
    borderRadius: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  examBoard: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qualityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

