import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';

interface Question {
  id: string;
  full_question_number: string;
  main_question_number: number;
  question_text: string;
  context_text: string | null;
  marks: number;
  command_word: string;
  question_type: string;
  has_image: boolean;
  image_url: string | null;
  image_description: string | null;
}

interface MarkingResult {
  marks_awarded: number;
  max_marks: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  matched_points: string[];
}

const EXTRACTION_SERVICE_URL = process.env.EXTRACTION_SERVICE_URL || 'https://subjectsandtopics-production.up.railway.app';

export default function QuestionPracticeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { paperId, paperName, subjectName, subjectColor } = route.params as any;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [markingResult, setMarkingResult] = useState<MarkingResult | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      // Check if questions already extracted
      const { data: existingQuestions, error: questionsError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('main_question_number')
        .order('full_question_number');

      if (questionsError) throw questionsError;

      if (existingQuestions && existingQuestions.length > 0) {
        // Already extracted - use cached!
        setQuestions(existingQuestions);
        setLoading(false);
        return;
      }

      // Not extracted yet - trigger extraction
      await extractPaper();
    } catch (error) {
      console.error('Error loading questions:', error);
      Alert.alert('Error', 'Failed to load questions');
      setLoading(false);
    }
  };

  const extractPaper = async () => {
    setExtracting(true);
    
    try {
      // Get paper details
      const { data: paperData } = await supabase
        .from('staging_aqa_exam_papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (!paperData) throw new Error('Paper not found');

      // Call extraction service
      const response = await fetch(`${EXTRACTION_SERVICE_URL}/api/extract-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          question_url: paperData.question_paper_url,
          mark_scheme_url: paperData.mark_scheme_url,
          examiner_report_url: paperData.examiner_report_url,
        }),
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      // Wait and reload questions
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadQuestions();
      
    } catch (error) {
      console.error('Extraction error:', error);
      Alert.alert(
        'Extraction In Progress',
        'Questions are being extracted. This takes 2-3 minutes. Please try again in a moment.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setExtracting(false);
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      Alert.alert('Please enter an answer');
      return;
    }

    setMarking(true);

    try {
      const currentQuestion = questions[currentIndex];

      // Call AI marking service
      const response = await fetch(`${EXTRACTION_SERVICE_URL}/api/mark-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          user_answer: userAnswer,
          user_id: user?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Marking failed');
      }

      const result = await response.json();
      setMarkingResult(result.marking);

    } catch (error) {
      console.error('Marking error:', error);
      Alert.alert('Error', 'Failed to mark answer. Please try again.');
    } finally {
      setMarking(false);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setMarkingResult(null);
    } else {
      Alert.alert(
        'Practice Complete!',
        'You\'ve completed all questions.',
        [{ text: 'Back to Papers', onPress: () => navigation.goBack() }]
      );
    }
  };

  if (loading || extracting) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00F5FF" />
          <Text style={styles.loadingText}>
            {extracting ? 'Extracting questions...\n(2-3 minutes)' : 'Loading questions...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="document-outline" size={64} color="#666" />
          <Text style={styles.emptyText}>No questions available</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#00F5FF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.paperName}>{paperName}</Text>
            <Text style={styles.progress}>
              Question {currentIndex + 1} of {questions.length}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionNumber}>
              Question {currentQuestion.full_question_number}
            </Text>
            <View style={styles.marksBadge}>
              <Text style={styles.marksText}>{currentQuestion.marks} marks</Text>
            </View>
          </View>

          {/* Context */}
          {currentQuestion.context_text && (
            <View style={styles.contextBox}>
              <Icon name="information-circle-outline" size={16} color="#00F5FF" />
              <Text style={styles.contextText}>{currentQuestion.context_text}</Text>
            </View>
          )}

          {/* Image */}
          {currentQuestion.has_image && currentQuestion.image_url && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentQuestion.image_url }}
                style={styles.questionImage}
                resizeMode="contain"
              />
              {currentQuestion.image_description && (
                <Text style={styles.imageCaption}>{currentQuestion.image_description}</Text>
              )}
            </View>
          )}

          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* Answer Section */}
        {!markingResult ? (
          <View style={styles.answerSection}>
            <Text style={styles.answerLabel}>Your Answer:</Text>
            <TextInput
              style={styles.answerInput}
              multiline
              placeholder="Type your answer here..."
              placeholderTextColor="#64748B"
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!marking}
            />
            <TouchableOpacity
              style={[styles.submitButton, marking && styles.submitButtonDisabled]}
              onPress={submitAnswer}
              disabled={marking}
            >
              {marking ? (
                <ActivityIndicator color="#0a0f1e" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="#0a0f1e" />
                  <Text style={styles.submitButtonText}>Submit Answer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.feedbackSection}>
            {/* Marks Awarded */}
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.marksCard}
            >
              <Text style={styles.marksAwarded}>
                {markingResult.marks_awarded} / {markingResult.max_marks}
              </Text>
              <Text style={styles.marksLabel}>marks</Text>
            </LinearGradient>

            {/* Feedback */}
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>📝 Feedback</Text>
              <Text style={styles.feedbackText}>{markingResult.feedback}</Text>
            </View>

            {/* Strengths */}
            {markingResult.strengths && markingResult.strengths.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>✅ Strengths</Text>
                {markingResult.strengths.map((strength, idx) => (
                  <Text key={idx} style={styles.bulletPoint}>• {strength}</Text>
                ))}
              </View>
            )}

            {/* Improvements */}
            {markingResult.improvements && markingResult.improvements.length > 0 && (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>📈 How to Improve</Text>
                {markingResult.improvements.map((improvement, idx) => (
                  <Text key={idx} style={styles.bulletPoint}>• {improvement}</Text>
                ))}
              </View>
            )}

            {/* Next Button */}
            <TouchableOpacity style={styles.nextButton} onPress={nextQuestion}>
              <Text style={styles.nextButtonText}>
                {currentIndex < questions.length - 1 ? 'Next Question →' : 'Finish Practice'}
              </Text>
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
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  paperName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  progress: {
    fontSize: 12,
    color: '#94A3B8',
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00F5FF',
  },
  marksBadge: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  marksText: {
    color: '#00F5FF',
    fontSize: 14,
    fontWeight: '600',
  },
  contextBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  contextText: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  imageContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  questionImage: {
    width: '100%',
    height: 200,
  },
  imageCaption: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    padding: 8,
    backgroundColor: '#F8FAFC',
  },
  questionText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  answerSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  answerInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#00F5FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: '#00D4E6',
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
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#0a0f1e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feedbackSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  marksCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  marksAwarded: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  marksLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  feedbackCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00F5FF',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 8,
  },
  nextButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 20,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#00F5FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0a0f1e',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

