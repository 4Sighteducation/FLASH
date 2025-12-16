import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface QuestionResult {
  questionNumber: string;
  marksAwarded: number;
  maxMarks: number;
  timeSpent: number;
  attempted: boolean;
}

export default function PaperCompletionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { paperId, paperName, totalQuestions } = route.params as any;

  const [results, setResults] = useState<QuestionResult[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    if (!user?.id) return;

    try {
      // Get all questions for this paper
      const { data: questions } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('main_question_number')
        .order('full_question_number');

      if (!questions) return;

      // Get all attempts for this user and paper
      const { data: attempts } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('user_id', user.id)
        .in('question_id', questions.map(q => q.id))
        .order('attempted_at', { ascending: false });

      // Calculate results
      let total = 0;
      let max = 0;
      let time = 0;

      const questionResults: QuestionResult[] = questions.map(q => {
        // Find most recent attempt for this question
        const attempt = attempts?.find(a => a.question_id === q.id);

        const marks = attempt?.marks_awarded || 0;
        const maxMarks = q.marks;
        const timeSpent = attempt?.time_taken_seconds || 0;

        total += marks;
        max += maxMarks;
        time += timeSpent;

        return {
          questionNumber: q.full_question_number,
          marksAwarded: marks,
          maxMarks: maxMarks,
          timeSpent: timeSpent,
          attempted: !!attempt,
        };
      });

      setResults(questionResults);
      setTotalScore(total);
      setMaxScore(max);
      setTotalTime(time);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: 'A*', color: '#10B981' };
    if (percentage >= 80) return { grade: 'A', color: '#10B981' };
    if (percentage >= 70) return { grade: 'B', color: '#3B82F6' };
    if (percentage >= 60) return { grade: 'C', color: '#F59E0B' };
    if (percentage >= 50) return { grade: 'D', color: '#EF4444' };
    return { grade: 'U', color: '#6B7280' };
  };

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = getGrade(percentage);
  const avgTimePerMark = totalScore > 0 ? totalTime / totalScore : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Calculating results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('PastPapersLibrary' as never)}>
            <Icon name="close" size={24} color="#00F5FF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paper Complete!</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Main Score Card */}
        <View style={styles.scoreSection}>
          <LinearGradient
            colors={[grade.color, '#1a1a2e']}
            style={styles.scoreCard}
          >
            <Text style={styles.congratsText}>🎉 Well Done!</Text>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{totalScore}</Text>
              <Text style={styles.scoreDivider}>/</Text>
              <Text style={styles.scoreMax}>{maxScore}</Text>
            </View>
            <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>Grade: {grade.grade}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {/* Questions Attempted */}
          <View style={styles.statCard}>
            <Icon name="document-text" size={24} color="#00F5FF" />
            <Text style={styles.statValue}>{results.filter(r => r.attempted).length}/{results.length}</Text>
            <Text style={styles.statLabel}>Attempted</Text>
          </View>

          {/* Total Time */}
          <View style={styles.statCard}>
            <Icon name="time" size={24} color="#00F5FF" />
            <Text style={styles.statValue}>{formatTime(totalTime)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          {/* Avg Time per Mark */}
          <View style={styles.statCard}>
            <Icon name="speedometer" size={24} color="#00F5FF" />
            <Text style={styles.statValue}>{avgTimePerMark.toFixed(1)}s</Text>
            <Text style={styles.statLabel}>Per Mark</Text>
          </View>
        </View>

        {/* Question Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Question Breakdown</Text>
          {results.map((result, index) => (
            <View key={index} style={styles.questionRow}>
              <View style={styles.questionInfo}>
                <Text style={styles.questionNumber}>Q{result.questionNumber}</Text>
                {!result.attempted && (
                  <View style={styles.skippedBadge}>
                    <Text style={styles.skippedText}>Skipped</Text>
                  </View>
                )}
              </View>
              <View style={styles.questionScore}>
                <Text style={[
                  styles.scoreText,
                  result.marksAwarded === result.maxMarks && styles.perfectScore,
                  result.marksAwarded === 0 && styles.zeroScore
                ]}>
                  {result.marksAwarded}/{result.maxMarks}
                </Text>
                {result.attempted && (
                  <Text style={styles.timeText}>{formatTime(result.timeSpent)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('QuestionPractice' as never, {
              paperId,
              paperName,
              reviewMode: true
            } as never)}
          >
            <Icon name="eye" size={20} color="#00F5FF" />
            <Text style={styles.actionButtonText}>Review Answers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.retryButton]}
            onPress={() => {
              // Clear progress and restart
              if (user?.id) {
                supabase
                  .from('paper_progress')
                  .delete()
                  .eq('user_id', user.id)
                  .eq('paper_id', paperId)
                  .then(() => {
                    navigation.navigate('QuestionPractice' as never, {
                      paperId,
                      paperName
                    } as never);
                  });
              }
            }}
          >
            <Icon name="refresh" size={20} color="#6366F1" />
            <Text style={[styles.actionButtonText, styles.retryButtonText]}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>

        {/* Done Button */}
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => navigation.navigate('PastPapersLibrary' as never)}
        >
          <Text style={styles.doneButtonText}>Back to Papers</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreSection: {
    padding: 20,
  },
  scoreCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: 'rgba(16, 185, 129, 0.5)',
      },
      default: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  congratsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  scoreDivider: {
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 8,
  },
  scoreMax: {
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.7)',
    fontVariant: ['tabular-nums'],
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  gradeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  gradeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00F5FF',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  breakdownSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00F5FF',
  },
  skippedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skippedText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  questionScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E2E8F0',
    fontVariant: ['tabular-nums'],
  },
  perfectScore: {
    color: '#10B981',
  },
  zeroScore: {
    color: '#6B7280',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  actionsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  actionButtonText: {
    color: '#00F5FF',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  retryButtonText: {
    color: '#6366F1',
  },
  doneButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

