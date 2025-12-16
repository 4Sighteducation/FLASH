import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ExamTimerProps {
  questionMarks: number;
  questionKey?: string;
  initialSeconds?: number;
  onTimeUpdate?: (seconds: number) => void;
  onTimerControl?: (control: { start: () => void; stop: () => void; reset: () => void; isPaused: () => boolean; autoStop: boolean }) => void;
}

export default function ExamTimer({ questionMarks, questionKey, initialSeconds, onTimeUpdate, onTimerControl }: ExamTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'up' | 'down'>('up');
  const [targetSeconds, setTargetSeconds] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [secondsPerMark, setSecondsPerMark] = useState(90); // Default: 1.5 min per mark
  const [autoStart, setAutoStart] = useState(false); // Auto-start timer on typing
  const [autoStop, setAutoStop] = useState(true); // Auto-stop timer on submit
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Reset timer when question changes or mode/settings change
  useEffect(() => {
    setIsRunning(false);
    if (mode === 'down') {
      const target = questionMarks * secondsPerMark;
      setTargetSeconds(target);
      if (typeof initialSeconds === 'number') {
        setSeconds(Math.min(Math.max(initialSeconds, 0), target));
      } else {
        setSeconds(target);
      }
    } else {
      setTargetSeconds(0);
      if (typeof initialSeconds === 'number') {
        setSeconds(Math.max(initialSeconds, 0));
      } else {
        setSeconds(0);
      }
    }
  }, [questionKey, mode, questionMarks, secondsPerMark]);

  // Apply resume seconds (only when explicitly provided)
  useEffect(() => {
    if (typeof initialSeconds === 'number') {
      setIsRunning(false);
      if (mode === 'down' && targetSeconds > 0) {
        setSeconds(Math.min(Math.max(initialSeconds, 0), targetSeconds));
      } else {
        setSeconds(Math.max(initialSeconds, 0));
      }
    }
  }, [initialSeconds]);

  // Timer logic
  useEffect(() => {
    if (isRunning && enabled) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const next = mode === 'up' ? prev + 1 : prev - 1;
          
          if (mode === 'down' && next <= 0) {
            setIsRunning(false);
            return 0;
          }
          
          return next;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode, enabled]);

  // Report time to parent
  useEffect(() => {
    if (onTimeUpdate) {
      // Always report elapsed seconds for consistent metrics
      const elapsed = mode === 'up' ? seconds : Math.max(0, targetSeconds - seconds);
      onTimeUpdate(elapsed);
    }
  }, [seconds, mode, targetSeconds]);

  // Expose timer controls to parent
  useEffect(() => {
    if (onTimerControl) {
      onTimerControl({
        start: () => {
          if (enabled && autoStart && !isRunning) {
            setIsRunning(true);
          }
        },
        stop: () => setIsRunning(false),
        reset: () => {
          setIsRunning(false);
          if (mode === 'down') setSeconds(targetSeconds);
          else setSeconds(0);
        },
        isPaused: () => !isRunning
        ,
        autoStop
      });
    }
  }, [onTimerControl, enabled, autoStart, autoStop, isRunning, mode, targetSeconds]);

  const loadSettings = async () => {
    try {
      const savedEnabled = await AsyncStorage.getItem('examTimer_enabled');
      const savedMode = await AsyncStorage.getItem('examTimer_mode');
      const savedSecondsPerMark = await AsyncStorage.getItem('examTimer_secondsPerMark');
      const savedAutoStart = await AsyncStorage.getItem('examTimer_autoStart');
      const savedAutoStop = await AsyncStorage.getItem('examTimer_autoStop');
      
      if (savedEnabled !== null) setEnabled(savedEnabled === 'true');
      if (savedMode) setMode(savedMode as 'up' | 'down');
      if (savedSecondsPerMark) setSecondsPerMark(parseInt(savedSecondsPerMark));
      if (savedAutoStart !== null) setAutoStart(savedAutoStart === 'true');
      if (savedAutoStop !== null) setAutoStop(savedAutoStop === 'true');
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('examTimer_enabled', enabled.toString());
      await AsyncStorage.setItem('examTimer_mode', mode);
      await AsyncStorage.setItem('examTimer_secondsPerMark', secondsPerMark.toString());
      await AsyncStorage.setItem('examTimer_autoStart', autoStart.toString());
      await AsyncStorage.setItem('examTimer_autoStop', autoStop.toString());
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (mode === 'down') {
      setSeconds(questionMarks * secondsPerMark);
    } else {
      setSeconds(0);
    }
  };

  const toggleMode = async () => {
    const newMode = mode === 'up' ? 'down' : 'up';
    setMode(newMode);
    setIsRunning(false);
    
    if (newMode === 'down') {
      setSeconds(questionMarks * secondsPerMark);
    } else {
      setSeconds(0);
    }
    
    await AsyncStorage.setItem('examTimer_mode', newMode);
  };

  const toggleEnabled = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    if (!newEnabled) {
      setIsRunning(false);
    }
    await AsyncStorage.setItem('examTimer_enabled', newEnabled.toString());
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!enabled) {
    return (
      <TouchableOpacity style={styles.disabledButton} onPress={toggleEnabled}>
        <Icon name="timer-outline" size={16} color="#64748B" />
        <Text style={styles.disabledText}>Enable Timer</Text>
      </TouchableOpacity>
    );
  }

  const timePercentage = mode === 'down' && targetSeconds > 0
    ? (seconds / targetSeconds) * 100
    : 0;

  const isLowTime = mode === 'down' && timePercentage < 20;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isLowTime ? ['#EF4444', '#DC2626'] : ['#6366F1', '#8B5CF6']}
        style={styles.timerCard}
      >
        <View style={styles.timerContent}>
          {/* Mode indicator */}
          <TouchableOpacity onPress={toggleMode} style={styles.modeButton}>
            <Icon 
              name={mode === 'up' ? 'arrow-up-circle' : 'arrow-down-circle'} 
              size={20} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>

          {/* Time display */}
          <TouchableOpacity onPress={toggleTimer} style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime(seconds)}</Text>
            {mode === 'down' && (
              <Text style={styles.targetText}>/ {formatTime(targetSeconds)}</Text>
            )}
          </TouchableOpacity>

          {/* Controls */}
          <View style={styles.controls}>
            <TouchableOpacity onPress={toggleTimer} style={styles.controlButton}>
              <Icon 
                name={isRunning ? 'pause' : 'play'} 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={resetTimer} style={styles.controlButton}>
              <Icon name="refresh" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.controlButton}>
              <Icon name="settings-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress bar (countdown mode only) */}
        {mode === 'down' && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${timePercentage}%` }]} />
          </View>
        )}
      </LinearGradient>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Timer Settings</Text>
              <TouchableOpacity onPress={() => {
                setShowSettings(false);
                saveSettings();
              }}>
                <Icon name="close" size={24} color="#E2E8F0" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsContent}>
              {/* Mode selection */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Mode</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[styles.segment, mode === 'up' && styles.segmentActive]}
                    onPress={() => setMode('up')}
                  >
                    <Text style={[styles.segmentText, mode === 'up' && styles.segmentTextActive]}>
                      Count Up
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segment, mode === 'down' && styles.segmentActive]}
                    onPress={() => setMode('down')}
                  >
                    <Text style={[styles.segmentText, mode === 'down' && styles.segmentTextActive]}>
                      Countdown
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time per mark (countdown only) */}
              {mode === 'down' && (
                <View style={styles.settingRow}>
                  <Text style={styles.settingLabel}>Time per Mark</Text>
                  <View style={styles.timeOptions}>
                    {[30, 45, 60, 90, 120, 150].map(secs => (
                      <TouchableOpacity
                        key={secs}
                        style={[
                          styles.timeOption,
                          secondsPerMark === secs && styles.timeOptionActive
                        ]}
                        onPress={() => setSecondsPerMark(secs)}
                      >
                        <Text style={[
                          styles.timeOptionText,
                          secondsPerMark === secs && styles.timeOptionTextActive
                        ]}>
                          {secs < 60 ? `${secs}s` : `${secs / 60} min`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <Text style={styles.sectionHeading}>Automation</Text>

              {/* Auto-start toggle */}
              <View style={styles.settingRowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Auto-Start on Answer Tap</Text>
                  <Text style={styles.settingDescription}>
                    Timer starts when you tap into the answer box
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, autoStart && styles.toggleActive]}
                  onPress={() => setAutoStart(!autoStart)}
                >
                  <View style={[styles.toggleKnob, autoStart && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              {/* Auto-stop toggle */}
              <View style={styles.settingRowInline}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Auto-Stop on Submit</Text>
                  <Text style={styles.settingDescription}>
                    Timer pauses automatically when you submit your answer
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.toggle, autoStop && styles.toggleActive]}
                  onPress={() => setAutoStop(!autoStop)}
                >
                  <View style={[styles.toggleKnob, autoStop && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              {/* Enable/disable */}
              <Text style={styles.sectionHeading}>General</Text>
              <View style={styles.settingRowInline}>
                <Text style={styles.settingLabel}>Timer Enabled</Text>
                <TouchableOpacity
                  style={[styles.toggle, enabled && styles.toggleActive]}
                  onPress={toggleEnabled}
                >
                  <View style={[styles.toggleKnob, enabled && styles.toggleKnobActive]} />
                </TouchableOpacity>
              </View>

              {/* Info */}
              <View style={styles.infoBox}>
                <Icon name="information-circle" size={20} color="#3B82F6" />
                <Text style={styles.infoText}>
                  {mode === 'up' 
                    ? 'Count up to track how long you take per question'
                    : `This question has ${questionMarks} marks, giving you ${formatTime(questionMarks * secondsPerMark)} total`
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const formatTime = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  timerCard: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: 'rgba(99, 102, 241, 0.5)',
      },
      default: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  modeButton: {
    padding: 8,
  },
  timeDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  targetText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    padding: 8,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
  },
  disabledText: {
    color: '#64748B',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    overflow: 'hidden',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingsContent: {
    padding: 20,
  },
  settingRow: {
    marginBottom: 24,
  },
  settingRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 12,
  },
  settingDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#6366F1',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  timeOptions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeOptionActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366F1',
  },
  timeOptionText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  timeOptionTextActive: {
    color: '#6366F1',
  },
  toggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#6366F1',
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
});

