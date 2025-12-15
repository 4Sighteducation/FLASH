import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';

const { width } = Dimensions.get('window');

interface PastPapersTutorialProps {
  visible: boolean;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Past Papers! 📄',
    description: 'Practice with real exam questions from past papers. Get AI-powered marking and feedback to improve your exam technique.',
    icon: 'document-text',
  },
  {
    title: 'Quality Tiers Explained',
    description: '✅ VERIFIED: Question + Mark Scheme + Examiner Report\n⭐ OFFICIAL: Question + Mark Scheme\n🤖 AI-ASSISTED: Question only (AI-generated mark scheme)\n\nHigher tiers = more accurate marking and richer feedback!',
    icon: 'star',
  },
  {
    title: 'How It Works',
    description: '1. Select a paper\n2. Questions are extracted (first time takes 2-3 min)\n3. Answer each question\n4. Get instant AI marking\n5. Learn from detailed feedback\n6. Track your progress!',
    icon: 'bulb',
  },
  {
    title: 'Study Smart',
    description: 'Use the timer to practice under exam conditions. Review examiner insights to learn common mistakes. Focus on Verified papers for the most accurate marking.',
    icon: 'time',
  },
  {
    title: 'Ready to Practice!',
    description: 'Tap the ? button anytime to see this tutorial again. Good luck with your revision!',
    icon: 'checkmark-circle',
  },
];

export default function PastPapersTutorial({ visible, onComplete }: PastPapersTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = TUTORIAL_STEPS[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.gradient}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Progress dots */}
            <View style={styles.progressDots}>
              {TUTORIAL_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentStep && styles.dotActive,
                  ]}
                />
              ))}
            </View>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Icon name={currentStepData.icon} size={64} color="#FFFFFF" />
            </View>

            {/* Content */}
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
              <Text style={styles.title}>{currentStepData.title}</Text>
              <Text style={styles.description}>{currentStepData.description}</Text>
            </ScrollView>

            {/* Navigation */}
            <View style={styles.navigation}>
              {currentStep > 0 && (
                <TouchableOpacity style={styles.navButton} onPress={() => setCurrentStep(currentStep - 1)}>
                  <Text style={styles.navButtonText}>← Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonPrimary]}
                onPress={handleNext}
              >
                <Text style={styles.navButtonTextPrimary}>
                  {currentStep === TUTORIAL_STEPS.length - 1 ? "Let's Go! 🚀" : 'Next →'}
                </Text>
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
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    padding: 24,
    minHeight: 400,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#FFFFFF',
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextPrimary: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

