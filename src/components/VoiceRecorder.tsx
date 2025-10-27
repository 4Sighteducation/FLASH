import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
import { audioService } from '../services/audioService';

// Lazy load expo-audio to prevent iOS crash on app launch
let useAudioRecorder: any = null;
let AudioModule: any = null;
let RecordingPresets: any = null;

async function getAudioModules() {
  if (!useAudioRecorder) {
    const audio = await import('expo-audio');
    useAudioRecorder = audio.useAudioRecorder;
    AudioModule = audio.AudioModule;
    RecordingPresets = audio.RecordingPresets;
  }
  return { useAudioRecorder, AudioModule, RecordingPresets };
}

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  color: string;
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 60,
  color,
}: VoiceRecorderProps) {
  const [audioRecorder, setAudioRecorder] = useState<any>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isCleanedUp, setIsCleanedUp] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const levelAnim = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const meteringInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize audio modules lazily
    const initializeAudio = async () => {
      try {
        const { useAudioRecorder, RecordingPresets } = await getAudioModules();
        const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
        setAudioRecorder(recorder);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
        Alert.alert('Audio Error', 'Failed to initialize audio recording.');
        onCancel();
      }
    };
    
    initializeAudio();
    
    return () => {
      setIsCleanedUp(true);
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (audioRecorder && !isLoading) {
      startRecording();
    }
  }, [audioRecorder, isLoading]);

  const cleanup = async () => {
    // Clear intervals
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    if (meteringInterval.current) {
      clearInterval(meteringInterval.current);
      meteringInterval.current = null;
    }
    
    // Stop recording if still active
    try {
      if (audioRecorder.isRecording) {
        await audioRecorder.stop();
      }
    } catch (error) {
      console.error('Error stopping recorder during cleanup:', error);
    }
  };

  useEffect(() => {
    // Pulse animation for recording indicator
    if (isRecording) {
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

  useEffect(() => {
    // Smooth audio level animation
    Animated.timing(levelAnim, {
      toValue: audioLevel,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [audioLevel]);

  const startRecording = async () => {
    if (!audioRecorder) return;
    
    try {
      setIsLoading(true);
      
      // Check permissions
      const { AudioModule } = await getAudioModules();
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant microphone access to use voice answers.',
          [{ text: 'OK', onPress: onCancel }]
        );
        return;
      }

      // Prepare audio mode
      await audioService.prepareAudioMode();

      // Prepare and start recording
      await audioRecorder.prepareToRecordAsync();
      
      // Check if component was cleaned up during async operations
      if (isCleanedUp) return;
      
      audioRecorder.record();
      setIsRecording(true);
      setIsLoading(false);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Start metering update
      meteringInterval.current = setInterval(() => {
        if (!isCleanedUp && audioRecorder.isRecording) {
          try {
            const status = audioRecorder.getStatus();
            if (status.isRecording && status.metering !== undefined) {
              // Normalize audio level from -160 to 0 dB to 0-1 range
              const normalizedLevel = Math.max(0, (status.metering + 160) / 160);
              setAudioLevel(normalizedLevel);
            }
          } catch (error) {
            // Ignore metering errors if recorder is released
            console.log('Metering update skipped:', error);
          }
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsLoading(false);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      onCancel();
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording || isCleanedUp) return;

    try {
      setIsLoading(true);
      
      // Clear intervals first
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      if (meteringInterval.current) {
        clearInterval(meteringInterval.current);
        meteringInterval.current = null;
      }

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      
      if (uri && !isCleanedUp) {
        onRecordingComplete(uri);
      } else if (!uri) {
        throw new Error('No recording URI');
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      if (!isCleanedUp) {
        Alert.alert('Recording Error', 'Failed to save recording. Please try again.');
        onCancel();
      }
    } finally {
      setIsRecording(false);
      setIsLoading(false);
    }
  };

  const cancelRecording = async () => {
    if (audioRecorder.isRecording && !isCleanedUp) {
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        if (uri) {
          await audioService.deleteRecording(uri);
        }
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
    onCancel();
  };

  const remainingTime = maxDuration - duration;
  const isNearEnd = remainingTime <= 10;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recording Your Answer</Text>
        <Text style={styles.subtitle}>Speak clearly and naturally</Text>
      </View>

      <View style={styles.visualizer}>
        <Animated.View
          style={[
            styles.recordingIndicator,
            {
              backgroundColor: color,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        
        <View style={styles.levelMeter}>
          <Animated.View
            style={[
              styles.levelBar,
              {
                backgroundColor: color,
                width: levelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.timerContainer}>
        <Text style={[styles.timer, isNearEnd && styles.timerWarning]}>
          {audioService.formatDuration(duration)}
        </Text>
        <Text style={styles.timerLabel}>
          {remainingTime > 0 ? `${remainingTime}s remaining` : 'Time limit reached'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={cancelRecording}
          disabled={isLoading}
        >
          <Ionicons name="close" size={24} color="#666" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.stopButton,
            { backgroundColor: color },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={stopRecording}
          disabled={isLoading || !isRecording}
        >
          <Ionicons name="stop" size={24} color="white" />
          <Text style={styles.stopButtonText}>Stop</Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  visualizer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
  },
  levelMeter: {
    width: 200,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelBar: {
    height: '100%',
    borderRadius: 4,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  timerWarning: {
    color: '#EF4444',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  stopButton: {
    minWidth: 120,
    justifyContent: 'center',
  },
  stopButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
}); 