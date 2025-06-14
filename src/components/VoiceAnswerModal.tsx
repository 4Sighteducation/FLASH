import React, { useState } from 'react';
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
  };
  color: string;
}

type ModalState = 'recording' | 'transcribing' | 'analyzing' | 'results';

export default function VoiceAnswerModal({
  visible,
  onClose,
  onComplete,
  card,
  color,
}: VoiceAnswerModalProps) {
  const [state, setState] = useState<ModalState>('recording');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecordingComplete = async (uri: string) => {
    setRecordingUri(uri);
    setState('transcribing');
    setError(null);

    try {
      // Transcribe the audio
      const result = await whisperService.transcribeAudio(uri);
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.text || result.text.trim().length === 0) {
        throw new Error('No speech detected. Please try again.');
      }

      setTranscription(result.text);
      setState('analyzing');

      // Analyze the answer
      const analysisResult = await aiAnalyzerService.analyzeAnswer(
        result.text,
        card.answer || card.detailed_answer || '',
        card.card_type,
        card.key_points
      );

      setAnalysis(analysisResult);
      setState('results');
    } catch (err) {
      console.error('Error processing voice answer:', err);
      setError(err instanceof Error ? err.message : 'Failed to process your answer');
      setState('results');
    } finally {
      // Clean up the recording
      if (uri) {
        await audioService.deleteRecording(uri);
      }
    }
  };

  const handleAcceptResult = () => {
    if (analysis) {
      onComplete(analysis.isCorrect);
    }
    resetModal();
  };

  const handleRejectResult = () => {
    // User disagrees with AI assessment, let them manually mark
    resetModal();
  };

  const handleRetry = () => {
    resetModal();
    setState('recording');
  };

  const resetModal = () => {
    setState('recording');
    setRecordingUri(null);
    setTranscription('');
    setAnalysis(null);
    setError(null);
    onClose();
  };

  const renderContent = () => {
    switch (state) {
      case 'recording':
        return (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onCancel={resetModal}
            color={color}
          />
        );

      case 'transcribing':
        return (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={color} />
            <Text style={styles.processingTitle}>Transcribing your answer...</Text>
            <Text style={styles.processingSubtitle}>Using OpenAI Whisper</Text>
          </View>
        );

      case 'analyzing':
        return (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={color} />
            <Text style={styles.processingTitle}>Analyzing your answer...</Text>
            <Text style={styles.processingSubtitle}>Comparing with the correct answer</Text>
          </View>
        );

      case 'results':
        return (
          <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#EF4444" />
                <Text style={styles.errorTitle}>Oops!</Text>
                <Text style={styles.errorMessage}>{error}</Text>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: color }]}
                  onPress={handleRetry}
                >
                  <Text style={styles.buttonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.transcriptionSection}>
                  <Text style={styles.sectionTitle}>What we heard:</Text>
                  <View style={styles.transcriptionBox}>
                    <Text style={styles.transcriptionText}>{transcription}</Text>
                  </View>
                </View>

                {analysis && (
                  <>
                    <View style={styles.analysisSection}>
                      <View style={[
                        styles.scoreCircle,
                        { borderColor: analysis.isCorrect ? '#10B981' : '#EF4444' }
                      ]}>
                        <Text style={[
                          styles.scoreText,
                          { color: analysis.isCorrect ? '#10B981' : '#EF4444' }
                        ]}>
                          {analysis.confidence}%
                        </Text>
                        <Text style={styles.scoreLabel}>Confidence</Text>
                      </View>

                      <View style={styles.feedbackBox}>
                        <Ionicons
                          name={analysis.isCorrect ? 'checkmark-circle' : 'information-circle'}
                          size={24}
                          color={analysis.isCorrect ? '#10B981' : '#F59E0B'}
                        />
                        <Text style={styles.feedbackText}>{analysis.feedback}</Text>
                      </View>

                      {analysis.keyPointsCovered && analysis.keyPointsCovered.length > 0 && (
                        <View style={styles.pointsSection}>
                          <Text style={styles.pointsTitle}>✓ Points you covered:</Text>
                          {analysis.keyPointsCovered.map((point, index) => (
                            <Text key={index} style={styles.pointItem}>• {point}</Text>
                          ))}
                        </View>
                      )}

                      {analysis.keyPointsMissed && analysis.keyPointsMissed.length > 0 && (
                        <View style={styles.pointsSection}>
                          <Text style={[styles.pointsTitle, { color: '#EF4444' }]}>
                            ✗ Points to improve:
                          </Text>
                          {analysis.keyPointsMissed.map((point, index) => (
                            <Text key={index} style={[styles.pointItem, { color: '#666' }]}>
                              • {point}
                            </Text>
                          ))}
                        </View>
                      )}

                      {analysis.suggestions && analysis.suggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                          <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
                          {analysis.suggestions.map((suggestion, index) => (
                            <Text key={index} style={styles.suggestionText}>{suggestion}</Text>
                          ))}
                        </View>
                      )}
                    </View>

                    <View style={styles.resultActions}>
                      <Text style={styles.resultPrompt}>
                        Does this assessment look correct?
                      </Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.button, styles.acceptButton]}
                          onPress={handleAcceptResult}
                        >
                          <Ionicons name="checkmark" size={20} color="white" />
                          <Text style={styles.buttonText}>Yes, that's right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.button, styles.rejectButton]}
                          onPress={handleRejectResult}
                        >
                          <Ionicons name="close" size={20} color="#666" />
                          <Text style={[styles.buttonText, { color: '#666' }]}>
                            No, let me mark manually
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={resetModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Voice Answer</Text>
            <TouchableOpacity onPress={resetModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '70%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
  },
  processingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
  },
  errorMessage: {
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
    marginBottom: 12,
  },
  transcriptionBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  analysisSection: {
    marginBottom: 24,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  scoreText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  pointsSection: {
    marginBottom: 16,
  },
  pointsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  pointItem: {
    fontSize: 14,
    color: '#333',
    marginLeft: 16,
    marginBottom: 4,
    lineHeight: 20,
  },
  suggestionsBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  resultActions: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resultPrompt: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
}); 