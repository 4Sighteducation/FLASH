import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { LeitnerSystem } from '../utils/leitnerSystem';

const { width } = Dimensions.get('window');

interface StudyWizardProps {
  visible: boolean;
  onClose: () => void;
}

const WIZARD_STEPS = [
  {
    title: 'How FLASH Works 🧠',
    description: 'Cards move through 5 stages based on how well you know them.',
    icon: 'school',
  },
  {
    title: 'Get It Right → Move Forward',
    description: 'Answer correctly and your card moves to the next stage, spacing out reviews.',
    icon: 'trending-up',
  },
  {
    title: 'Get It Wrong → Back to Start',
    description: 'Miss a card? No problem! It goes back to daily review until you master it.',
    icon: 'refresh',
  },
  {
    title: 'The 5 Learning Stages',
    description: 'Each stage reviews at the perfect interval for long-term memory.',
    icon: 'trophy',
    showStages: true,
  },
];

export default function StudyWizard({ visible, onClose }: StudyWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handleSkip = () => {
    onClose();
    setCurrentStep(0);
  };

  const step = WIZARD_STEPS[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.gradient}
          >
            {/* Progress Dots */}
            <View style={styles.progressDots}>
              {WIZARD_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Content */}
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Icon name={step.icon as any} size={64} color="#fff" />
              </View>

              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>

              {/* Show Stages on Last Step */}
              {step.showStages && (
                <View style={styles.stagesContainer}>
                  {[1, 2, 3, 4, 5].map((boxNumber) => {
                    const info = LeitnerSystem.getBoxInfo(boxNumber);
                    return (
                      <View key={boxNumber} style={styles.stageItem}>
                        <Text style={styles.stageEmoji}>{info.emoji}</Text>
                        <View style={styles.stageInfo}>
                          <Text style={styles.stageName}>{info.name}</Text>
                          <Text style={styles.stageInterval}>
                            {info.displayInterval}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Visual Diagram (for step 2) */}
              {currentStep === 1 && (
                <View style={styles.diagramContainer}>
                  <View style={styles.diagramRow}>
                    <View style={styles.diagramBox}>
                      <Text style={styles.diagramEmoji}>🌱</Text>
                    </View>
                    <Text style={styles.diagramArrow}>→ ✅ →</Text>
                    <View style={styles.diagramBox}>
                      <Text style={styles.diagramEmoji}>📚</Text>
                    </View>
                    <Text style={styles.diagramArrow}>→ ✅ →</Text>
                    <View style={styles.diagramBox}>
                      <Text style={styles.diagramEmoji}>🚀</Text>
                    </View>
                  </View>
                  <Text style={styles.diagramLabel}>
                    Reviews get less frequent as you learn
                  </Text>
                </View>
              )}

              {/* Wrong Answer Diagram (for step 3) */}
              {currentStep === 2 && (
                <View style={styles.diagramContainer}>
                  <View style={styles.diagramRow}>
                    <View style={styles.diagramBox}>
                      <Text style={styles.diagramEmoji}>🚀</Text>
                    </View>
                    <Text style={styles.diagramArrowWrong}>→ ❌ →</Text>
                    <View style={styles.diagramBox}>
                      <Text style={styles.diagramEmoji}>🌱</Text>
                    </View>
                  </View>
                  <Text style={styles.diagramLabel}>
                    Practice makes perfect! Try again daily
                  </Text>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleNext}
              >
                <Text style={styles.buttonText}>
                  {currentStep === WIZARD_STEPS.length - 1 ? "Got It!" : "Next"}
                </Text>
                {currentStep !== WIZARD_STEPS.length - 1 && (
                  <Icon name="arrow-forward" size={20} color="#6366F1" />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: Math.min(width - 40, 400),
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  gradient: {
    padding: 24,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    marginVertical: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  stagesContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  stageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stageEmoji: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  stageInfo: {
    flex: 1,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stageInterval: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  diagramContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
  },
  diagramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diagramEmoji: {
    fontSize: 28,
  },
  diagramArrow: {
    fontSize: 18,
    color: '#fff',
    marginHorizontal: 8,
  },
  diagramArrowWrong: {
    fontSize: 18,
    color: '#fff',
    marginHorizontal: 12,
  },
  diagramLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 16,
  },
  buttons: {
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
});

