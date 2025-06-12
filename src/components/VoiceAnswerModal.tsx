import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VoiceAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  question: string;
  expectedAnswer: string;
  onAnswerEvaluated: (correct: boolean) => void;
  color: string;
}

// This is a concept component for future AI voice implementation
export default function VoiceAnswerModal({
  visible,
  onClose,
  question,
  expectedAnswer,
  onAnswerEvaluated,
  color,
}: VoiceAnswerModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    correct: boolean;
    confidence: number;
    feedback: string;
    transcript: string;
  } | null>(null);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (isRecording) {
      // Pulse animation for recording indicator
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    // Future: Implement actual voice recording
    // For now, simulate recording for 3 seconds
    setTimeout(() => {
      stopRecording();
    }, 3000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      // Mock AI result
      setAiResult({
        correct: Math.random() > 0.5,
        confidence: Math.floor(Math.random() * 30) + 70,
        feedback: "You covered the main points well, but could expand on the specific examples.",
        transcript: "This is what the AI heard you say...",
      });
      setIsProcessing(false);
    }, 2000);
  };

  const handleUserOverride = (agree: boolean) => {
    if (aiResult) {
      onAnswerEvaluated(agree ? aiResult.correct : !aiResult.correct);
    }
    onClose();
  };

  const resetModal = () => {
    setAiResult(null);
    setIsProcessing(false);
    setIsRecording(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <Text style={styles.title}>Voice Answer</Text>
          <Text style={styles.question}>{question}</Text>

          {!isRecording && !isProcessing && !aiResult && (
            <View style={styles.startSection}>
              <Text style={styles.instruction}>
                Tap the microphone and speak your answer clearly
              </Text>
              <TouchableOpacity
                style={[styles.micButton, { backgroundColor: color }]}
                onPress={startRecording}
              >
                <Ionicons name="mic" size={48} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {isRecording && (
            <View style={styles.recordingSection}>
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { backgroundColor: color, transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Ionicons name="mic" size={48} color="white" />
              </Animated.View>
              <Text style={styles.recordingText}>Listening...</Text>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={stopRecording}
              >
                <Text style={styles.stopButtonText}>Stop Recording</Text>
              </TouchableOpacity>
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingSection}>
              <ActivityIndicator size="large" color={color} />
              <Text style={styles.processingText}>AI is analyzing your answer...</Text>
            </View>
          )}

          {aiResult && (
            <View style={styles.resultSection}>
              <View style={[styles.resultHeader, { backgroundColor: aiResult.correct ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons
                  name={aiResult.correct ? "checkmark-circle" : "close-circle"}
                  size={32}
                  color={aiResult.correct ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.resultText, { color: aiResult.correct ? '#065F46' : '#991B1B' }]}>
                  AI thinks: {aiResult.correct ? 'Correct!' : 'Not quite right'}
                </Text>
                <Text style={styles.confidenceText}>
                  {aiResult.confidence}% confident
                </Text>
              </View>

              <View style={styles.transcriptSection}>
                <Text style={styles.sectionTitle}>What I heard:</Text>
                <Text style={styles.transcript}>{aiResult.transcript}</Text>
              </View>

              <View style={styles.feedbackSection}>
                <Text style={styles.sectionTitle}>Feedback:</Text>
                <Text style={styles.feedback}>{aiResult.feedback}</Text>
              </View>

              <View style={styles.overrideSection}>
                <Text style={styles.overridePrompt}>Do you agree with the AI?</Text>
                <View style={styles.overrideButtons}>
                  <TouchableOpacity
                    style={[styles.overrideButton, styles.agreeButton]}
                    onPress={() => handleUserOverride(true)}
                  >
                    <Text style={styles.overrideButtonText}>Yes, that's right</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overrideButton, styles.disagreeButton]}
                    onPress={() => handleUserOverride(false)}
                  >
                    <Text style={styles.overrideButtonText}>No, I disagree</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  question: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  startSection: {
    alignItems: 'center',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  recordingSection: {
    alignItems: 'center',
  },
  recordingIndicator: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 16,
    fontWeight: '600',
  },
  stopButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#EF4444',
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  processingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  resultSection: {
    marginTop: 16,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  transcriptSection: {
    marginBottom: 16,
  },
  feedbackSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  transcript: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  feedback: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
  },
  overrideSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  overridePrompt: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  overrideButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  overrideButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  agreeButton: {
    backgroundColor: '#10B981',
  },
  disagreeButton: {
    backgroundColor: '#6B7280',
  },
  overrideButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 