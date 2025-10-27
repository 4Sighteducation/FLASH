import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
import VoiceRecorder from './VoiceRecorder';
import { whisperService } from '../services/whisperService';
import { aiAnalyzerService, AnalysisResult } from '../services/aiAnalyzerService';
import { audioService } from '../services/audioService';

interface VoiceAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (correct: boolean) => void;
  card: {
    question: string;
    answer?: string;
    card_type: 'short_answer' | 'essay' | 'acronym';
    key_points?: string[];
    detailed_answer?: string;
    exam_type?: string; // 'alevel' or 'gcse'
  };
  color: string;
}

type ModalState = 'recording' | 'transcribing' | 'analyzing' | 'result';

// Grade thresholds
const ALEVEL_GRADES = [
  { grade: 'A*', minScore: 90 },
  { grade: 'A', minScore: 85 },
  { grade: 'B', minScore: 75 },
  { grade: 'C', minScore: 65 },
  { grade: 'D', minScore: 55 },
  { grade: 'E', minScore: 45 },
  { grade: 'U', minScore: 0 },
];

const GCSE_GRADES = [
  { grade: '9', minScore: 97 },
  { grade: '8', minScore: 90 },
  { grade: '7', minScore: 80 },
  { grade: '6', minScore: 70 },
  { grade: '5', minScore: 60 },
  { grade: '4', minScore: 50 },
  { grade: '3', minScore: 40 },
  { grade: '2', minScore: 30 },
  { grade: '1', minScore: 20 },
  { grade: 'U', minScore: 0 },
];

export default function VoiceAnswerModal({
  visible,
  onClose,
  onComplete,
  card,
  color,
}: VoiceAnswerModalProps) {
  const [state, setState] = useState<ModalState>('recording');
  const [transcription, setTranscription] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // Cleanup recording when modal closes
  useEffect(() => {
    return () => {
      if (recordingUri) {
        audioService.deleteRecording(recordingUri).catch(console.error);
      }
    };
  }, [recordingUri]);

  const getGrade = (score: number): string => {
    const examType = card.exam_type?.toLowerCase() || 'alevel';
    const grades = examType === 'gcse' ? GCSE_GRADES : ALEVEL_GRADES;
    for (const { grade, minScore } of grades) {
      if (score >= minScore) {
        return grade;
      }
    }
    return 'U';
  };

  const getGradeColor = (grade: string): string => {
    const examType = card.exam_type?.toLowerCase() || 'alevel';
    if (examType === 'gcse') {
      if (['9', '8', '7'].includes(grade)) return '#10B981'; // Green
      if (['6', '5', '4'].includes(grade)) return '#F59E0B'; // Amber
      return '#EF4444'; // Red
    } else {
      if (['A*', 'A', 'B'].includes(grade)) return '#10B981'; // Green
      if (['C', 'D'].includes(grade)) return '#F59E0B'; // Amber
      return '#EF4444'; // Red
    }
  };

  const handleRecordingComplete = async (uri: string) => {
    setRecordingUri(uri);
    setState('transcribing');
    setError(null);

    try {
      // Transcribe audio
      const result = await whisperService.transcribeAudio(uri);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setTranscription(result.text);
      setState('analyzing');

      // Analyze answer
      const analysisResult = await aiAnalyzerService.analyzeAnswer(
        result.text,
        card.answer || '',
        card.card_type,
        card.key_points
      );

      setAnalysis(analysisResult);
      setState('result');
    } catch (err) {
      console.error('Error processing voice answer:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setState('result');
    }
    // Note: We don't delete the recording here anymore - it will be cleaned up when the modal closes
  };

  const handleAcceptResult = async () => {
    if (analysis) {
      // Consider it correct if confidence is 60% or higher (Grade 5/C or above)
      const isCorrect = analysis.confidence >= 60;
      onComplete(isCorrect);
    }
    
    // Clean up recording before closing
    if (recordingUri) {
      await audioService.deleteRecording(recordingUri);
      setRecordingUri(null);
    }
    
    onClose();
  };

  const handleRetry = () => {
    // Clean up previous recording before retry
    if (recordingUri) {
      audioService.deleteRecording(recordingUri).catch(console.error);
      setRecordingUri(null);
    }
    
    setState('recording');
    setTranscription('');
    setAnalysis(null);
    setError(null);
    setShowModelAnswer(false);
  };

  const handleClose = async () => {
    // Clean up recording before closing
    if (recordingUri) {
      await audioService.deleteRecording(recordingUri);
      setRecordingUri(null);
    }
    onClose();
  };

  const reset = () => {
    setState('recording');
    setTranscription('');
    setAnalysis(null);
    setError(null);
    setRecordingUri(null);
    setShowModelAnswer(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Answer</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {state === 'recording' && (
            <VoiceRecorder
              onRecordingComplete={handleRecordingComplete}
              onCancel={handleClose}
              color={color}
            />
          )}

          {state === 'transcribing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={color} />
              <Text style={styles.processingText}>Transcribing your answer...</Text>
            </View>
          )}

          {state === 'analyzing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={color} />
              <Text style={styles.processingText}>Analyzing your answer...</Text>
            </View>
          )}

          {state === 'result' && (
            <View style={styles.resultContainer}>
              {error ? (
                <View style={styles.errorContainer}>
                  <Icon name="alert-circle" size={48} color="#EF4444" />
                  <Text style={styles.errorTitle}>Error</Text>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: color }]}
                    onPress={handleRetry}
                  >
                    <Text style={styles.buttonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : analysis && (
                <>
                  <View style={styles.transcriptionSection}>
                    <Text style={styles.sectionTitle}>Your Answer:</Text>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </View>

                  <View style={styles.gradeSection}>
                    <Text style={styles.gradeLabel}>Grade Assessment:</Text>
                    <View style={styles.gradeContainer}>
                      <Text style={[
                        styles.grade,
                        { color: getGradeColor(getGrade(analysis.confidence)) }
                      ]}>
                        {getGrade(analysis.confidence)}
                      </Text>
                      <Text style={styles.gradePercentage}>
                        ({analysis.confidence}%)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.feedbackSection}>
                    <Text style={styles.sectionTitle}>Feedback:</Text>
                    <Text style={styles.feedbackText}>{analysis.feedback}</Text>
                  </View>

                  {analysis.keyPointsCovered && analysis.keyPointsCovered.length > 0 && (
                    <View style={styles.pointsSection}>
                      <Text style={styles.pointsTitle}>
                        <Icon name="checkmark-circle" size={16} color="#10B981" /> Key Points Covered:
                      </Text>
                      {analysis.keyPointsCovered.map((point, index) => (
                        <Text key={index} style={styles.pointItem}>• {point}</Text>
                      ))}
                    </View>
                  )}

                  {analysis.keyPointsMissed && analysis.keyPointsMissed.length > 0 && (
                    <View style={styles.pointsSection}>
                      <Text style={styles.pointsTitle}>
                        <Icon name="close-circle" size={16} color="#EF4444" /> Key Points Missed:
                      </Text>
                      {analysis.keyPointsMissed.map((point, index) => (
                        <Text key={index} style={styles.pointItem}>• {point}</Text>
                      ))}
                    </View>
                  )}

                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <View style={styles.suggestionsSection}>
                      <Text style={styles.sectionTitle}>Suggestions for Improvement:</Text>
                      {analysis.suggestions.map((suggestion, index) => (
                        <Text key={index} style={styles.suggestionItem}>• {suggestion}</Text>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.modelAnswerButton}
                    onPress={() => setShowModelAnswer(!showModelAnswer)}
                  >
                    <Ionicons 
                      name={showModelAnswer ? "eye-off" : "eye"} 
                      size={20} 
                      color={color} 
                    />
                    <Text style={[styles.modelAnswerButtonText, { color }]}>
                      {showModelAnswer ? 'Hide' : 'Show'} Model Answer
                    </Text>
                  </TouchableOpacity>

                  {showModelAnswer && (
                    <View style={styles.modelAnswerSection}>
                      <Text style={styles.sectionTitle}>Model Answer:</Text>
                      <Text style={styles.modelAnswerText}>
                        {card.detailed_answer || card.answer || 'No model answer available'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.button, styles.retryButton]}
                      onPress={handleRetry}
                    >
                      <Icon name="refresh" size={20} color="#666" />
                      <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, { backgroundColor: color }]}
                      onPress={handleAcceptResult}
                    >
                      <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.helpText}>
                    {analysis.confidence >= 60 
                      ? "Good job! Your answer will be marked as correct."
                      : "Your answer needs improvement. It will be marked for review."}
                  </Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  transcriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  gradeSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  gradeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  grade: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  gradePercentage: {
    fontSize: 18,
    color: '#666',
  },
  feedbackSection: {
    marginBottom: 20,
  },
  feedbackText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginBottom: 4,
  },
  suggestionsSection: {
    marginBottom: 20,
  },
  suggestionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  modelAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  modelAnswerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modelAnswerSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modelAnswerText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  retryButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
}); 