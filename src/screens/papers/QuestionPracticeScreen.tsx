import React, { useEffect, useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import ExamTimer from '../../components/ExamTimer';
import PaperExtractionModal from '../../components/PaperExtractionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [questionTime, setQuestionTime] = useState(0);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [showPreviousAnswer, setShowPreviousAnswer] = useState(false);
  const [timerControl, setTimerControl] = useState<{
    start: () => void;
    stop: () => void;
    reset: () => void;
    isPaused: () => boolean;
    autoStop: boolean;
  } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionStep, setExtractionStep] = useState('Initializing extraction...');
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [extractionStatusId, setExtractionStatusId] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const [resumeTimerSeconds, setResumeTimerSeconds] = useState<number | undefined>(undefined);
  const [paperUrls, setPaperUrls] = useState<{
    question_paper_url?: string | null;
    mark_scheme_url?: string | null;
    examiner_report_url?: string | null;
  } | null>(null);

  useEffect(() => {
    loadQuestions();
    checkForSavedProgress();
    loadPaperUrls();
  }, []);

  const loadPaperUrls = async () => {
    try {
      const { data } = await supabase
        .from('staging_aqa_exam_papers')
        .select('question_paper_url, mark_scheme_url, examiner_report_url')
        .eq('id', paperId)
        .maybeSingle();
      setPaperUrls(data || null);
    } catch (e) {
      console.warn('[Papers] failed to load paper urls', e);
    }
  };

  // Clear resume seconds after they've been applied once
  useEffect(() => {
    if (resumeTimerSeconds !== undefined) {
      const t = setTimeout(() => setResumeTimerSeconds(undefined), 0);
      return () => clearTimeout(t);
    }
  }, [resumeTimerSeconds]);

  const checkForSavedProgress = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('paper_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('paper_id', paperId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

      if (data) {
        Alert.alert(
          'Resume Paper?',
          `You paused this paper on question ${data.current_question_index + 1}. Would you like to resume where you left off?`,
          [
            {
              text: 'Start Fresh',
              onPress: async () => {
                // Delete saved progress
                await supabase
                  .from('paper_progress')
                  .delete()
                  .eq('user_id', user.id)
                  .eq('paper_id', paperId);
              }
            },
            {
              text: 'Resume',
              onPress: () => {
                setCurrentIndex(data.current_question_index);
                setUserAnswer(data.current_answer || '');
                setQuestionTime(data.timer_seconds || 0);
                setResumeTimerSeconds(data.timer_seconds || 0);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking for saved progress:', error);
    }
  };

  // Load previous attempts when question changes
  useEffect(() => {
    if (questions.length > 0 && user?.id) {
      loadPreviousAttempts();
    }
  }, [currentIndex, questions]);

  const loadPreviousAttempts = async () => {
    if (!user?.id || questions.length === 0) return;

    const currentQuestion = questions[currentIndex];
    
    try {
      const { data } = await supabase
        .from('student_attempts')
        .select('*')
        .eq('question_id', currentQuestion.id)
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false });

      setPreviousAttempts(data || []);
    } catch (error) {
      console.error('Error loading previous attempts:', error);
    }
  };

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
    try {
      if (!user?.id) {
        throw new Error('Must be signed in to extract papers');
      }

      // Get paper details
      const { data: paperData } = await supabase
        .from('staging_aqa_exam_papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (!paperData) throw new Error('Paper not found');
      if (!paperData.question_paper_url) {
        throw new Error('This paper is missing a question paper PDF URL.');
      }

      // Reuse existing extraction status if present (prevents duplicate requests when user leaves and returns)
      const { data: existingStatus } = await supabase
        .from('paper_extraction_status')
        .select('*')
        .eq('paper_id', paperId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingStatus) {
        if (existingStatus.status === 'completed') {
          // Status says completed - reload questions from DB
          setLoading(true);
          await loadQuestions();
          setLoading(false);
          return;
        }

        if (existingStatus.status === 'failed') {
          Alert.alert(
            'Extraction Failed Previously',
            existingStatus.error_message || 'Would you like to retry extraction?',
            [
              { text: 'Go Back', style: 'cancel', onPress: () => navigation.goBack() },
              {
                text: 'Retry',
                onPress: async () => {
                  await supabase
                    .from('paper_extraction_status')
                    .update({
                      status: 'pending',
                      progress_percentage: 0,
                      current_step: 'Retrying extraction...',
                      error_message: null,
                    })
                    .eq('id', existingStatus.id);

                  setExtractionStatusId(existingStatus.id);
                  setShowExtractionModal(true);
                  setExtractionProgress(0);
                  setExtractionStep('Retrying extraction...');
                  startPollingExtractionStatus(existingStatus.id);

                  fetch(`${EXTRACTION_SERVICE_URL}/api/extract-paper`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      paper_id: paperId,
                      extraction_status_id: existingStatus.id,
                      question_url: paperData.question_paper_url,
                      mark_scheme_url: paperData.mark_scheme_url,
                      examiner_report_url: paperData.examiner_report_url,
                    }),
                  }).catch(error => {
                    console.error('Background extraction error:', error);
                  });
                },
              },
            ]
          );
          return;
        }

        // pending / extracting - show modal and keep polling, don't re-trigger extraction
        setExtractionStatusId(existingStatus.id);
        setShowExtractionModal(true);
        setExtractionProgress(existingStatus.progress_percentage || 0);
        setExtractionStep(existingStatus.current_step || 'Processing...');
        startPollingExtractionStatus(existingStatus.id);
        return;
      }

      // Create extraction status record (upsert to respect unique(paper_id,user_id))
      const { data: statusData, error: statusError } = await supabase
        .from('paper_extraction_status')
        .upsert(
          {
            paper_id: paperId,
            user_id: user.id,
            status: 'pending',
            progress_percentage: 0,
            current_step: 'Initializing extraction...',
          },
          { onConflict: 'paper_id,user_id' }
        )
        .select()
        .single();

      if (statusError) throw statusError;

      setExtractionStatusId(statusData.id);
      setShowExtractionModal(true);
      setExtractionProgress(0);
      setExtractionStep('Starting extraction process...');

      // Start polling for status updates
      startPollingExtractionStatus(statusData.id);

      // Trigger extraction in background
      console.log('[Papers] Triggering extraction', {
        paperId,
        extraction_status_id: statusData.id,
      });
      fetch(`${EXTRACTION_SERVICE_URL}/api/extract-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paper_id: paperId,
          extraction_status_id: statusData.id,
          question_url: paperData.question_paper_url,
          mark_scheme_url: paperData.mark_scheme_url,
          examiner_report_url: paperData.examiner_report_url,
        }),
      }).catch(error => {
        console.error('Background extraction error:', error);
      });
      
    } catch (error) {
      console.error('Extraction error:', error);
      Alert.alert(
        'Extraction Error',
        error instanceof Error ? error.message : 'Failed to start extraction. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const startPollingExtractionStatus = (statusId: string) => {
    // Poll every 3 seconds
    pollingInterval.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('paper_extraction_status')
          .select('*')
          .eq('id', statusId)
          .single();

        if (error) throw error;

        if (data) {
          setExtractionProgress(data.progress_percentage || 0);
          setExtractionStep(data.current_step || 'Processing...');

          if (data.status === 'completed') {
            // Extraction complete!
            stopPollingExtractionStatus();
            setShowExtractionModal(false);
            setLoading(true);
            await loadQuestions();
            setLoading(false);
            
            // Show success notification
            Alert.alert(
              'Extraction Complete! ✅',
              'Questions are ready to practice.',
              [{
                text: 'Start Practicing',
                onPress: async () => {}
              }]
            );
          } else if (data.status === 'failed') {
            stopPollingExtractionStatus();
            setShowExtractionModal(false);
            Alert.alert(
              'Extraction Failed',
              data.error_message || 'Something went wrong during extraction.',
              [{ text: 'Go Back', onPress: () => navigation.goBack() }]
            );
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);
  };

  const stopPollingExtractionStatus = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPollingExtractionStatus();
    };
  }, []);

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      Alert.alert('Please enter an answer');
      return;
    }

    // Auto-stop timer on submit (if enabled)
    if (timerControl?.autoStop) {
      timerControl.stop();
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
          time_taken_seconds: questionTime,  // Send timer data!
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

  const skipQuestion = () => {
    // If there's a previous attempt, retain it
    if (previousAttempts.length > 0) {
      Alert.alert(
        'Skip Question',
        'Your previous answer will be retained and counted towards your total score.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Skip & Retain', 
            onPress: () => {
              // Move to next question without submitting new answer
              if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setUserAnswer('');
                setMarkingResult(null);
              } else {
                // Show completion
                showCompletionSummary();
              }
            }
          }
        ]
      );
    } else {
      // No previous attempt - just skip
      Alert.alert(
        'Skip Question',
        'This question will not be counted towards your total score.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Skip', 
            onPress: () => {
              if (currentIndex < questions.length - 1) {
                setCurrentIndex(currentIndex + 1);
                setUserAnswer('');
                setMarkingResult(null);
              } else {
                showCompletionSummary();
              }
            }
          }
        ]
      );
    }
  };

  const pausePaper = async () => {
    // Stop timer
    if (timerControl) {
      timerControl.stop();
    }
    
    // Save progress to database
    try {
      const { error } = await supabase
        .from('paper_progress')
        .upsert({
          user_id: user?.id,
          paper_id: paperId,
          current_question_index: currentIndex,
          current_answer: userAnswer,
          timer_seconds: questionTime,
          paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      Alert.alert(
        'Paper Paused',
        'Your progress has been saved. You can resume anytime from the Papers tab.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving progress:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    }
  };

  const showCompletionSummary = () => {
    navigation.navigate('PaperCompletion' as never, {
      paperId,
      paperName,
      subjectName,
      subjectColor,
      totalQuestions: questions.length
    } as never);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setMarkingResult(null);
    } else {
      showCompletionSummary();
    }
  };

  const handleAnswerFocus = () => {
    // Auto-start timer when user focuses on answer field
    if (timerControl && !userAnswer) {
      timerControl.start();
    }
  };

  const handleLeaveExtraction = () => {
    setShowExtractionModal(false);
    // Keep polling in background
    Alert.alert(
      'Extraction Continues',
      'Extraction will continue in the background. Come back later to practice.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  if (loading && !showExtractionModal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00F5FF" />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Only show "No questions" if we're not extracting/loading
  if (questions.length === 0 && !showExtractionModal && !loading) {
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
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

        {/* Timer */}
        <View style={styles.timerContainer}>
          <ExamTimer 
            questionMarks={currentQuestion.marks}
            questionKey={currentQuestion.id}
            initialSeconds={resumeTimerSeconds}
            onTimeUpdate={setQuestionTime}
            onTimerControl={setTimerControl}
          />
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={skipQuestion}
          >
            <Icon name="play-skip-forward" size={18} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.pauseButton]}
            onPress={pausePaper}
          >
            <Icon name="pause" size={18} color="#3B82F6" />
            <Text style={[styles.actionButtonText, styles.pauseButtonText]}>Pause Paper</Text>
          </TouchableOpacity>
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

          {/* Image missing fallback */}
          {currentQuestion.has_image && !currentQuestion.image_url && (
            <View style={styles.missingImageBox}>
              <Icon name="information-circle" size={16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.missingImageTitle}>Diagram required</Text>
                <Text style={styles.missingImageText}>
                  This question likely needs a diagram/image that isn’t available in-app yet.
                  You can open the original PDF to view it.
                </Text>
              </View>
              {!!paperUrls?.question_paper_url && (
                <TouchableOpacity
                  style={styles.openPdfButton}
                  onPress={() => Linking.openURL(paperUrls.question_paper_url!)}
                >
                  <Text style={styles.openPdfButtonText}>Open PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>
        </View>

        {/* Answer Section */}
        {!markingResult ? (
          <View style={styles.answerSection}>
            {/* Previous Attempts Toggle */}
            {previousAttempts.length > 0 && (
              <TouchableOpacity 
                style={styles.previousToggle}
                onPress={() => setShowPreviousAnswer(!showPreviousAnswer)}
              >
                <Icon 
                  name={showPreviousAnswer ? 'eye-off' : 'eye'} 
                  size={18} 
                  color="#3B82F6" 
                />
                <Text style={styles.previousToggleText}>
                  {showPreviousAnswer ? 'Hide' : 'Show'} Previous Answer ({previousAttempts.length})
                </Text>
              </TouchableOpacity>
            )}

            {/* Previous Answer Display */}
            {showPreviousAnswer && previousAttempts[0] && (
              <View style={styles.previousAnswerCard}>
                <View style={styles.previousHeader}>
                  <Text style={styles.previousLabel}>
                    Your last answer - {previousAttempts[0].marks_awarded}/{previousAttempts[0].max_marks} marks
                  </Text>
                  <Text style={styles.previousDate}>
                    {new Date(previousAttempts[0].attempted_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.previousAnswerText}>
                  {previousAttempts[0].user_answer}
                </Text>
                {previousAttempts[0].ai_feedback && (
                  <Text style={styles.previousFeedback}>
                    💬 {previousAttempts[0].ai_feedback}
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.answerLabel}>Your Answer:</Text>
            <TextInput
              style={styles.answerInput}
              multiline
              placeholder="Type your answer here..."
              placeholderTextColor="#64748B"
              value={userAnswer}
              onChangeText={setUserAnswer}
              onFocus={handleAnswerFocus}
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
      </KeyboardAvoidingView>

      {/* Extraction Modal */}
      <PaperExtractionModal
        visible={showExtractionModal}
        progress={extractionProgress}
        currentStep={extractionStep}
        onCancel={handleLeaveExtraction}
        allowCancel={true}
      />
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
  timerContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
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
  previousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  previousToggleText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  previousAnswerCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  previousHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previousLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  previousDate: {
    fontSize: 12,
    color: '#64748B',
  },
  previousAnswerText: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 8,
  },
  previousFeedback: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  timerContainer: {
    paddingHorizontal: 20,
  },
  actionButtonsRow: {
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  actionButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  pauseButtonText: {
    color: '#3B82F6',
  },
  missingImageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  missingImageTitle: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  missingImageText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16,
  },
  openPdfButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  openPdfButtonText: {
    color: '#00F5FF',
    fontSize: 12,
    fontWeight: '700',
  },
});

