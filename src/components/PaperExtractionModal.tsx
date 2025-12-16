import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';

interface PaperExtractionModalProps {
  visible: boolean;
  progress: number;
  currentStep: string;
  metaText?: string;
  onCancel?: () => void;
  allowCancel?: boolean;
  onRetry?: () => void;
  allowRetry?: boolean;
}

export default function PaperExtractionModal({
  visible,
  progress,
  currentStep,
  metaText,
  onCancel,
  allowCancel = true,
  onRetry,
  allowRetry = false,
}: PaperExtractionModalProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={['rgba(10, 15, 30, 0.98)', 'rgba(20, 30, 60, 0.98)', 'rgba(10, 15, 30, 0.98)']}
          style={styles.container}
        >
          {/* Cyber Grid Background */}
          <View style={styles.cyberGrid} />

          {/* Main Content */}
          <View style={styles.content}>
            {/* Document Icon with Glow */}
            <View style={styles.iconContainer}>
              <Animated.View
                style={[
                  styles.iconGlow,
                  {
                    opacity: glowAnim,
                    transform: [{
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#00F5FF', '#0088FF', '#00F5FF']}
                  style={styles.iconGradient}
                >
                  <Text style={styles.iconText}>📄</Text>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Status Text */}
            <Text style={styles.title}>Extracting Exam Paper</Text>
            <Text style={styles.subtitle}>
              This may take 2-30 minutes depending on paper length
            </Text>
            <Text style={styles.stepText}>{currentStep}</Text>
            {!!metaText && <Text style={styles.metaText}>{metaText}</Text>}

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#00F5FF', '#0088FF', '#00D4AA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>

                {/* Animated Scanner Line */}
                <Animated.View
                  style={[
                    styles.scannerLine,
                    {
                      opacity: glowAnim,
                    },
                  ]}
                />
              </View>

              {/* Progress Percentage */}
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={styles.decorativeLine} />
              <Text style={styles.decorativeText}>◇ PROCESSING ◇</Text>
              <View style={styles.decorativeLine} />
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Icon name="information-circle" size={20} color="#00F5FF" />
              <Text style={styles.infoText}>
                You can leave this screen and continue using the app. We'll notify you when extraction is complete.
              </Text>
            </View>

            {/* Cancel Button */}
            {allowCancel && onCancel && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Leave & Continue Using App</Text>
              </TouchableOpacity>
            )}

            {/* Retry Button (when stuck) */}
            {allowRetry && onRetry && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={onRetry}
              >
                <Text style={styles.retryButtonText}>Retry Extraction</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 420,
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 40px rgba(0, 245, 255, 0.4)',
      },
      default: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
      },
    }),
  },
  cyberGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      default: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
      },
    }),
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00F5FF',
    marginBottom: 8,
    textAlign: 'center',
    ...Platform.select({
      default: {
        textShadowColor: '#00F5FF',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
      },
    }),
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 18,
  },
  stepText: {
    fontSize: 15,
    color: '#00D4AA',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '600',
    minHeight: 20,
  },
  metaText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: -18,
    marginBottom: 18,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressGradient: {
    flex: 1,
    ...Platform.select({
      default: {
        shadowColor: '#00F5FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
      },
    }),
  },
  scannerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    width: 3,
  },
  progressText: {
    fontSize: 18,
    color: '#00F5FF',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  decorativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
    width: '100%',
  },
  decorativeLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.3)',
  },
  decorativeText: {
    fontSize: 10,
    color: 'rgba(0, 245, 255, 0.6)',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#00F5FF',
    lineHeight: 19,
  },
  cancelButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  cancelButtonText: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
  },
  retryButtonText: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});

