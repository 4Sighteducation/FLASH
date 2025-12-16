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
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  findNodeHandle,
  Modal,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import Icon from '../../components/Icon';
import ExamTimer from '../../components/ExamTimer';
import PaperExtractionModal from '../../components/PaperExtractionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PointsAnimation from '../../components/PointsAnimation';
import { gamificationService } from '../../services/gamificationService';

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
  image_page?: number | null;
}

interface MarkingResult {
  marks_awarded: number;
  max_marks: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  matched_points: string[];
  needs_self_mark?: boolean;
}

interface ExaminerInsight {
  id: string;
  question_id: string | null;
  paper_id: string | null;
  advice_for_students: string | null;
  examiner_comments: string | null;
  common_errors: string[] | null;
  good_practice_examples: string[] | null;
}

// Expo automatically exposes only EXPO_PUBLIC_* env vars to the JS bundle.
// Keep a fallback for safety, and allow legacy EXTRACTION_SERVICE_URL for older builds/scripts.
const EXTRACTION_SERVICE_URL =
  process.env.EXPO_PUBLIC_PAPERS_API_URL ||
  process.env.EXTRACTION_SERVICE_URL ||
  'https://subjectsandtopics-production.up.railway.app';

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
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const [resumeTimerSeconds, setResumeTimerSeconds] = useState<number | undefined>(undefined);
  const [paperUrls, setPaperUrls] = useState<{
    question_paper_url?: string | null;
    mark_scheme_url?: string | null;
    examiner_report_url?: string | null;
  } | null>(null);
  const paperUrlsRef = useRef<{
    question_paper_url?: string | null;
    mark_scheme_url?: string | null;
    examiner_report_url?: string | null;
  } | null>(null);
  const [extractionRequestSent, setExtractionRequestSent] = useState(false);
  const [lastExtractionUpdateAt, setLastExtractionUpdateAt] = useState<string | null>(null);
  const [staleSeconds, setStaleSeconds] = useState<number>(0);
  const [canRetryExtraction, setCanRetryExtraction] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const answerInputRef = useRef<TextInput | null>(null);
  const [maxIndexReached, setMaxIndexReached] = useState(0);
  const [examinerInsight, setExaminerInsight] = useState<ExaminerInsight | null>(null);
  const [showExaminerInsight, setShowExaminerInsight] = useState(false);
  const currentQuestionId = questions[currentIndex]?.id ?? null;
  const [showAnswerEditor, setShowAnswerEditor] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [animationPoints, setAnimationPoints] = useState(0);

  useEffect(() => {
    loadQuestions();
    checkForSavedProgress();
    loadPaperUrls();
  }, []);

  // IMPORTANT: hooks must run before any early returns below.
  // Load examiner insight for the current question (if available).
  useEffect(() => {
    if (!currentQuestionId) {
      setExaminerInsight(null);
      setShowExaminerInsight(false);
      return;
    }
    loadExaminerInsight(currentQuestionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  // Track keyboard height so we can ensure answer input is visible on small screens
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
      // Give layout a moment, then scroll the focused input into view
      setTimeout(() => {
        scrollAnswerIntoView();
      }, 120);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollAnswerIntoView = () => {
    try {
      const node = findNodeHandle(answerInputRef.current);
      // @ts-ignore - these responder methods exist at runtime
      const responder = scrollViewRef.current?.getScrollResponder?.();
      // @ts-ignore
      if (node && responder?.scrollResponderScrollNativeHandleToKeyboard) {
        // @ts-ignore
        responder.scrollResponderScrollNativeHandleToKeyboard(node, 140, true);
      }
    } catch {
      // best-effort only
    }
  };

  const getQuestionPaperUrl = () =>
    paperUrlsRef.current?.question_paper_url ?? paperUrls?.question_paper_url ?? null;

  const withPdfPage = (url: string, page?: number | null) => {
    if (!page || page <= 0) return url;
    const [base, hash] = url.split('#');
    const pageFragment = `page=${page}`;
    if (!hash) return `${base}#${pageFragment}`;
    if (hash.includes('page=')) {
      return `${base}#${hash.replace(/page=\d+/i, pageFragment)}`;
    }
    return `${base}#${hash}&${pageFragment}`;
  };

  const openQuestionPaperPdf = async (page?: number | null) => {
    const url = getQuestionPaperUrl();
    if (!url) {
      Alert.alert('PDF Unavailable', 'This paper is missing a question paper PDF URL.');
      return;
    }
    const target = withPdfPage(url, page);
    try {
      await WebBrowser.openBrowserAsync(target, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      });
    } catch (e) {
      console.warn('[Papers] openBrowserAsync failed, falling back to Linking.openURL', e);
      Linking.openURL(target);
    }
  };

  const parseMultipleChoiceOptions = (text: string) => {
    // Heuristic parser for options embedded in extracted question text.
    // Supports:
    //  A) option text
    //  A. option text
    //  A option text
    //  (A) option text
    //  A - option text
    const lines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const options: { key: string; text: string }[] = [];
    for (const line of lines) {
      const m = line.match(/^\(?([A-H])\)?\s*[\)\.\-:]?\s+(.*)$/i);
      if (m) {
        const key = m[1].toUpperCase();
        const optText = m[2].trim();
        if (optText.length > 0) options.push({ key, text: optText });
      }
    }
    // If the text contains option markers without newlines (rare), try splitting by " A " patterns
    if (options.length < 2) return [];
    // Ensure unique by key, preserve first
    const seen = new Set<string>();
    return options.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)));
  };

  // Track staleness of extraction updates to distinguish "slow" vs "stuck"
  useEffect(() => {
    if (!showExtractionModal) return;
    const t = setInterval(() => {
      const base = lastExtractionUpdateAt;
      if (!base) return;
      const ms = Date.now() - new Date(base).getTime();
      const secs = Math.max(0, Math.floor(ms / 1000));
      setStaleSeconds(secs);
      setCanRetryExtraction(secs >= 60); // no updates for 60s → offer retry
    }, 1000);
    return () => clearInterval(t);
  }, [showExtractionModal, lastExtractionUpdateAt]);

  const loadPaperUrls = async () => {
    try {
      const { data } = await supabase
        .from('staging_aqa_exam_papers')
        .select('question_paper_url, mark_scheme_url, examiner_report_url')
        .eq('id', paperId)
        .maybeSingle();
      paperUrlsRef.current = data || null;
      setPaperUrls(data || null);
    } catch (e) {
      console.warn('[Papers] failed to load paper urls', e);
    }
  };

  const triggerExtractionRequest = async (
    statusId: string,
    overrideUrls?: {
      question_paper_url?: string | null;
      mark_scheme_url?: string | null;
      examiner_report_url?: string | null;
    }
  ) => {
    const urls = overrideUrls ?? paperUrlsRef.current ?? paperUrls;
    if (!urls?.question_paper_url) {
      Alert.alert('Cannot Start Extraction', 'Missing question paper PDF URL for this paper.');
      return;
    }
    setExtractionStep('Sending extraction request…');
    setExtractionRequestSent(false);

    try {
      // Best-effort update to reflect retry in UI/polling
      await supabase
        .from('paper_extraction_status')
        .update({
          status: 'pending',
          progress_percentage: 0,
          current_step: 'Retrying extraction...',
          error_message: null,
        })
        .eq('id', statusId);
    } catch (e) {
      console.warn('[Papers] failed to update status before retry', e);
    }

    fetch(`${EXTRACTION_SERVICE_URL}/api/extract-paper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paper_id: paperId,
        extraction_status_id: statusId,
        question_url: urls.question_paper_url,
        mark_scheme_url: urls.mark_scheme_url,
        examiner_report_url: urls.examiner_report_url,
      }),
    })
      .then((res) => {
        setExtractionRequestSent(true);
        console.log('[Papers] extract-paper request accepted:', res.status);
      })
      .catch((err) => {
        console.error('[Papers] extract-paper request failed:', err);
        setExtractionStep('Failed to contact extraction service.');
      });
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

      // Ensure we have URLs available for retries (don’t rely on separate loadPaperUrls timing)
      const urls = {
        question_paper_url: paperData.question_paper_url,
        mark_scheme_url: paperData.mark_scheme_url,
        examiner_report_url: paperData.examiner_report_url,
      };
      paperUrlsRef.current = urls;
      setPaperUrls(urls);

      // Quick connectivity check so we don't create "pending forever" rows
      setExtractionStep('Checking extraction service...');
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const healthRes = await fetch(`${EXTRACTION_SERVICE_URL}/health`, {
          signal: controller.signal as any,
        });
        clearTimeout(t);
        if (!healthRes.ok) {
          throw new Error(`Extraction service health check failed (${healthRes.status})`);
        }
      } catch (e) {
        throw new Error(
          'Cannot reach extraction service right now. Please try again in a moment (or check Railway is running).'
        );
      }

      // Reuse existing extraction status if present (prevents duplicate requests when user leaves and returns)
      const { data: existingStatus } = await supabase
        .from('paper_extraction_status')
        .select('*')
        .eq('paper_id', paperId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingStatus) {
        // If we have a stale pending/extracting job, prompt a retry (this is the common “stuck at 0%” case).
        const lastUpdate = existingStatus.updated_at || existingStatus.created_at;
        const staleMs = lastUpdate ? Date.now() - new Date(lastUpdate).getTime() : 0;
        const isStale = staleMs > 60_000; // 60s with no updates
        const isPendingish = existingStatus.status === 'pending' || existingStatus.status === 'extracting';

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
                  setLastExtractionUpdateAt(existingStatus.updated_at || existingStatus.created_at || null);
                  startPollingExtractionStatus(existingStatus.id);

                  triggerExtractionRequest(existingStatus.id, urls);
                },
              },
            ]
          );
          return;
        }

        // pending / extracting - show modal and keep polling
        setExtractionStatusId(existingStatus.id);
        setShowExtractionModal(true);
        setExtractionProgress(existingStatus.progress_percentage || 0);
        setExtractionStep(existingStatus.current_step || 'Processing...');
        setLastExtractionUpdateAt(existingStatus.updated_at || existingStatus.created_at || null);
        startPollingExtractionStatus(existingStatus.id);

        // If stale, offer to retry immediately (and actually re-trigger POST)
        if (isPendingish && isStale) {
          Alert.alert(
            'Extraction looks stuck',
            'No progress updates were received for over a minute. Would you like to retry sending the extraction request?',
            [
              { text: 'Keep Waiting', style: 'cancel' },
              {
                text: 'Retry Now',
                onPress: () => {
                  triggerExtractionRequest(existingStatus.id, urls);
                },
              },
            ]
          );
        }

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
      setExtractionRequestSent(false);
      setLastExtractionUpdateAt(new Date().toISOString());

      // Start polling for status updates
      startPollingExtractionStatus(statusData.id);

      // Trigger extraction in background
      console.log('[Papers] Triggering extraction', {
        paperId,
        extraction_status_id: statusData.id,
      });
      triggerExtractionRequest(statusData.id, urls);
      
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
          if (data.updated_at) setLastExtractionUpdateAt(data.updated_at);

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

      const result = (await response.json()) as any;
      const marking = result.marking;

      // Fallback only: backend may explicitly request self-mark for MCQ/diagram cases it can't grade reliably
      if (marking?.needs_self_mark) {
        setMarking(false);
        const max = Math.max(0, Number(currentQuestion.marks) || 0);
        Alert.alert(
          'Unable to mark accurately',
          marking?.feedback ||
            'FLASH can’t mark this question reliably yet. Please open the PDF/mark scheme and select your score.',
          [
            {
              text: 'Open PDF',
              onPress: async () => {
                await openQuestionPaperPdf(currentQuestion.image_page ?? null);
              },
            },
            { text: 'Select score', style: 'default' },
          ]
        );
        Alert.alert(
          'Select marks',
          `How many marks did you get (0–${max})?`,
          Array.from({ length: max + 1 }, (_, i) => ({
            text: String(i),
            onPress: async () => {
              if (!user?.id) return;
              await supabase.from('student_attempts').insert({
                user_id: user.id,
                question_id: currentQuestion.id,
                user_answer: userAnswer,
                marks_awarded: i,
                max_marks: max,
                ai_feedback: 'Self-marked (unable to mark accurately)',
                strengths: [],
                improvements: [],
                time_taken_seconds: questionTime,
              });
              setMarkingResult({
                marks_awarded: i,
                max_marks: max,
                feedback: 'Self-marked (unable to mark accurately).',
                strengths: [],
                improvements: [],
                matched_points: [],
              });
            },
          }))
        );
        return;
      }

      setMarkingResult(marking);

      // Award per-question XP (first attempt only), based on marks awarded.
      if (user?.id && marking?.marks_awarded && currentQuestion?.id) {
        const award = await gamificationService.awardPaperQuestionXp({
          userId: user.id,
          paperId,
          questionId: currentQuestion.id,
          marksAwarded: Number(marking.marks_awarded) || 0,
        });
        if (award.awarded && award.points > 0) {
          setAnimationPoints(award.points);
          setShowPointsAnimation(true);
        }
      }

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
    (navigation as any).navigate('PaperCompletion', {
      paperId,
      paperName,
      subjectName,
      subjectColor,
      totalQuestions: questions.length
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setMaxIndexReached((m) => Math.max(m, next));
      setUserAnswer('');
      setMarkingResult(null);
    } else {
      showCompletionSummary();
    }
  };

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setUserAnswer('');
      setMarkingResult(null);
    }
  };

  const handleAnswerFocus = () => {
    // Auto-start timer when user focuses on answer field
    if (timerControl && !userAnswer) {
      timerControl.start();
    }
    // Scroll to ensure input is visible above keyboard
    setTimeout(() => scrollAnswerIntoView(), 120);
  };

  const loadExaminerInsight = async (questionId: string) => {
    try {
      const { data, error } = await supabase
        .from('examiner_insights')
        .select('*')
        .eq('question_id', questionId)
        .maybeSingle();
      if (error) throw error;
      setExaminerInsight((data as any) || null);
      setShowExaminerInsight(false);
    } catch (e) {
      console.warn('[Papers] failed to load examiner insight', e);
      setExaminerInsight(null);
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

  // If extraction modal is showing but we don't have questions yet, do NOT try to render question UI.
  // (Otherwise we crash on currentQuestion.marks when extraction fails quickly.)
  if (questions.length === 0 && showExtractionModal) {
    const statusLine = extractionRequestSent ? 'request sent' : 'request not yet confirmed';
    const metaText = lastExtractionUpdateAt
      ? `Status: ${statusLine} • Last update: ${Math.floor(staleSeconds / 60)}m ${staleSeconds % 60}s ago`
      : `Status: ${statusLine}`;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing extraction…</Text>
        </View>
        <PaperExtractionModal
          visible={showExtractionModal}
          progress={extractionProgress}
          currentStep={extractionStep}
          metaText={metaText}
          onCancel={handleLeaveExtraction}
          allowCancel={true}
          allowRetry={canRetryExtraction && !!extractionStatusId}
          onRetry={() => {
            if (extractionStatusId) triggerExtractionRequest(extractionStatusId);
          }}
        />
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLikelyMultipleChoice = /tick\s*\(?.*?\)?\s*one\s*box|tick\s+one\s+box|multiple\s+choice/i.test(
    currentQuestion.question_text || ''
  );
  const mcqOptions = isLikelyMultipleChoice ? parseMultipleChoiceOptions(currentQuestion.question_text || '') : [];
  const hasMcqOptions = mcqOptions.length >= 2;

  return (
    <SafeAreaView style={styles.container}>
      <PointsAnimation
        points={animationPoints}
        visible={showPointsAnimation}
        onComplete={() => setShowPointsAnimation(false)}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
      <ScrollView
        ref={(r) => {
          // @ts-ignore - RN's ScrollView ref typing can be picky
          scrollViewRef.current = r;
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Avoid double-padding: KeyboardAvoidingView already shifts content on iOS.
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <Icon name="close" size={22} color="#00F5FF" />
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
            style={[styles.actionButton, styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
            onPress={prevQuestion}
            disabled={currentIndex === 0}
          >
            <Icon name="arrow-back-circle" size={18} color={currentIndex === 0 ? '#475569' : '#3B82F6'} />
            <Text style={[styles.actionButtonText, styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
              Prev
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.skipOrNextButton]}
            onPress={() => {
              // If user navigated back, moving forward should be Next (not Skip).
              // Also, if the question already has a previous attempt OR the user has typed something,
              // treat this as Next to avoid repeated "Skip" confirmations deep into a paper.
              const hasPrior = (previousAttempts?.length || 0) > 0;
              const hasTyped = !!userAnswer.trim();
              const canNextWithoutSkipping = currentIndex < maxIndexReached || hasPrior || hasTyped || !!markingResult;
              if (canNextWithoutSkipping) nextQuestion();
              else skipQuestion();
            }}
          >
            <Icon
              name={(currentIndex < maxIndexReached || (previousAttempts?.length || 0) > 0 || !!userAnswer.trim() || !!markingResult) ? 'chevron-forward' : 'play-skip-forward'}
              size={18}
              color="#F59E0B"
            />
            <Text style={styles.actionButtonText}>
              {(currentIndex < maxIndexReached || (previousAttempts?.length || 0) > 0 || !!userAnswer.trim() || !!markingResult) ? 'Next' : 'Skip'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.pauseButton]}
            onPress={pausePaper}
          >
            <Icon name="pause" size={18} color="#3B82F6" />
            <Text style={[styles.actionButtonText, styles.pauseButtonText]}>Pause</Text>
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
              {!!getQuestionPaperUrl() && (
                <TouchableOpacity
                  style={styles.openPdfButton}
                  onPress={() => openQuestionPaperPdf(currentQuestion.image_page)}
                >
                  <Text style={styles.openPdfButtonText}>Open PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Question Text */}
          <Text style={styles.questionText}>{currentQuestion.question_text}</Text>

          {/* Multiple choice fallback */}
          {isLikelyMultipleChoice && (
            <View style={styles.missingImageBox}>
              <Icon name="information-circle" size={16} color="#F59E0B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.missingImageTitle}>Multiple choice</Text>
                <Text style={styles.missingImageText}>
                  {hasMcqOptions
                    ? 'Tap an option below to select it (you can still type your own answer if you prefer).'
                    : 'This looks like a “tick one box” question. The answer options aren’t available in-app yet — open the PDF to view the choices, then enter your selected letter/answer below.'}
                </Text>
              </View>
              {!hasMcqOptions && !!getQuestionPaperUrl() && (
                <TouchableOpacity
                  style={styles.openPdfButton}
                  onPress={() => openQuestionPaperPdf(currentQuestion.image_page)}
                >
                  <Text style={styles.openPdfButtonText}>Open PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Multiple choice options (when present in extracted text) */}
          {hasMcqOptions && (
            <View style={styles.mcqOptionsBox}>
              {mcqOptions.map((opt) => {
                const selected = userAnswer.trim().toUpperCase() === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.mcqOptionRow, selected && styles.mcqOptionRowSelected]}
                    onPress={() => setUserAnswer(opt.key)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.mcqOptionKey, selected && styles.mcqOptionKeySelected]}>
                      <Text style={[styles.mcqOptionKeyText, selected && styles.mcqOptionKeyTextSelected]}>
                        {opt.key}
                      </Text>
                    </View>
                    <Text style={[styles.mcqOptionText, selected && styles.mcqOptionTextSelected]}>
                      {opt.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {!!getQuestionPaperUrl() && (
                <TouchableOpacity
                  style={[styles.openPdfButton, { alignSelf: 'flex-start', marginTop: 10 }]}
                  onPress={() => openQuestionPaperPdf(currentQuestion.image_page)}
                >
                  <Text style={styles.openPdfButtonText}>Open PDF (full context)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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

            <View style={styles.answerHeaderRow}>
              <Text style={styles.answerLabel}>Your Answer:</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                {!!getQuestionPaperUrl() && (
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => openQuestionPaperPdf(currentQuestion.image_page)}
                  >
                    <Icon name="document-text" size={16} color="#00F5FF" />
                    <Text style={styles.expandButtonText}>Open PDF</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setShowAnswerEditor(true)}
                >
                  <Icon name="create-outline" size={16} color="#00F5FF" />
                  <Text style={styles.expandButtonText}>Expand</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TextInput
              ref={(r) => {
                // @ts-ignore
                answerInputRef.current = r;
              }}
              style={styles.answerInput}
              multiline
              placeholder={isLikelyMultipleChoice ? 'Type your selected letter/answer here...' : 'Type your answer here...'}
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

            {/* Examiner Insight (from examiner report) */}
            {!!examinerInsight && (
              <View style={styles.feedbackCard}>
                <TouchableOpacity
                  onPress={() => setShowExaminerInsight((s) => !s)}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Text style={styles.feedbackTitle}>👩‍🏫 Examiner Insight</Text>
                  <Icon name={showExaminerInsight ? 'chevron-up' : 'chevron-down'} size={18} color="#00F5FF" />
                </TouchableOpacity>
                {showExaminerInsight && (
                  <View style={{ marginTop: 10 }}>
                    {!!examinerInsight.examiner_comments && (
                      <Text style={styles.feedbackText}>{examinerInsight.examiner_comments}</Text>
                    )}
                    {!!examinerInsight.advice_for_students && (
                      <>
                        <Text style={[styles.feedbackTitle, { marginTop: 12 }]}>💡 Advice</Text>
                        <Text style={styles.feedbackText}>{examinerInsight.advice_for_students}</Text>
                      </>
                    )}
                    {!!examinerInsight.common_errors?.length && (
                      <>
                        <Text style={[styles.feedbackTitle, { marginTop: 12 }]}>❌ Common errors</Text>
                        {examinerInsight.common_errors.slice(0, 4).map((x, idx) => (
                          <Text key={idx} style={styles.bulletPoint}>• {x}</Text>
                        ))}
                      </>
                    )}
                    {!!examinerInsight.good_practice_examples?.length && (
                      <>
                        <Text style={[styles.feedbackTitle, { marginTop: 12 }]}>✅ Good practice</Text>
                        {examinerInsight.good_practice_examples.slice(0, 4).map((x, idx) => (
                          <Text key={idx} style={styles.bulletPoint}>• {x}</Text>
                        ))}
                      </>
                    )}
                  </View>
                )}
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

      {/* Expanded answer editor (better UX for long responses) */}
      <Modal
        visible={showAnswerEditor}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnswerEditor(false)}
      >
        <View style={styles.editorOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <View style={styles.editorSheet}>
              <View style={styles.editorHeader}>
                <Text style={styles.editorTitle}>Answer</Text>
                <TouchableOpacity onPress={() => setShowAnswerEditor(false)} style={styles.editorDoneButton}>
                  <Text style={styles.editorDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editorInput}
                multiline
                autoFocus
                placeholder="Type your answer here..."
                placeholderTextColor="#64748B"
                value={userAnswer}
                onChangeText={setUserAnswer}
              />
              <View style={styles.editorHintRow}>
                <Text style={styles.editorHintText}>
                  Tip: You can write long answers here comfortably, then tap Done.
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Extraction Modal */}
      <PaperExtractionModal
        visible={showExtractionModal}
        progress={extractionProgress}
        currentStep={extractionStep}
        metaText={
          lastExtractionUpdateAt
            ? `Last update: ${Math.floor(staleSeconds / 60)}m ${staleSeconds % 60}s ago`
            : undefined
        }
        onCancel={handleLeaveExtraction}
        allowCancel={true}
        allowRetry={canRetryExtraction && !!extractionStatusId}
        onRetry={() => {
          if (extractionStatusId) triggerExtractionRequest(extractionStatusId);
        }}
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
  headerIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.22)',
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
  answerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 245, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  expandButtonText: {
    color: '#00F5FF',
    fontSize: 12,
    fontWeight: '700',
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
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  editorSheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.18)',
    maxHeight: Math.min(Dimensions.get('window').height * 0.70, 520),
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  editorTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  editorDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  editorDoneText: {
    color: '#00F5FF',
    fontWeight: '800',
  },
  editorInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 15,
    minHeight: 220,
    textAlignVertical: 'top',
  },
  editorHintRow: {
    marginTop: 10,
  },
  editorHintText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
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
  navButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.28)',
  },
  navButtonText: {
    color: '#3B82F6',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(71, 85, 105, 0.10)',
    borderColor: 'rgba(71, 85, 105, 0.22)',
  },
  navButtonTextDisabled: {
    color: '#475569',
  },
  skipOrNextButton: {
    // keep existing amber styling from actionButton
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
  mcqOptionsBox: {
    marginTop: -6,
    marginBottom: 16,
    gap: 10,
  },
  mcqOptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 12,
    borderRadius: 12,
  },
  mcqOptionRowSelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  mcqOptionKey: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  mcqOptionKeySelected: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: 'rgba(245, 158, 11, 0.55)',
  },
  mcqOptionKeyText: {
    color: '#00F5FF',
    fontWeight: '800',
  },
  mcqOptionKeyTextSelected: {
    color: '#F59E0B',
  },
  mcqOptionText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  mcqOptionTextSelected: {
    color: '#FFFFFF',
  },
});

