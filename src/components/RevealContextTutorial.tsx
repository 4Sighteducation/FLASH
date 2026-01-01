import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');
const IS_MOBILE = screenWidth < 768;

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  emoji: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to Curriculum Map!',
    description: 'Discover how topics connect and build your knowledge progressively, like revealing a skill tree in a game.',
    icon: 'map',
    emoji: '🗺️',
  },
  {
    title: 'See Related Topics',
    description: 'Grey circles (⚪) show topics you haven\'t studied yet. They\'re related to your current topic - siblings in the curriculum.',
    icon: 'git-branch',
    emoji: '🎯',
  },
  {
    title: 'Quick Create Cards',
    description: 'Click "+ Create" on any grey topic to instantly generate flashcards. Watch it turn green (✅) as you expand your knowledge!',
    icon: 'add-circle',
    emoji: '✨',
  },
  {
    title: 'Overview Cards',
    description: 'Click "Generate Overview Cards" to create comparison questions that help you understand how multiple topics relate to each other.',
    icon: 'layers',
    emoji: '💡',
  },
  {
    title: 'Explore & Collapse',
    description: 'For complex subjects, collapse Level 0 parent sections to focus on specific areas. Open them later when you\'re ready!',
    icon: 'folder',
    emoji: '📚',
  },
];

interface RevealContextTutorialProps {
  visible: boolean;
  onComplete: () => void;
  subjectColor: string;
}

export default function RevealContextTutorial({
  visible,
  onComplete,
  subjectColor,
}: RevealContextTutorialProps) {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setCurrentStep(0);
    onComplete();
  };

  const step = tutorialSteps[currentStep];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={[styles.tutorialCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>{step.emoji}</Text>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>
              {step.title}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {step.description}
            </Text>
          </View>

          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {tutorialSteps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStep && { 
                    backgroundColor: subjectColor,
                    width: 24,
                  },
                  idx !== currentStep && { 
                    backgroundColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
              onPress={handleBack}
              disabled={currentStep === 0}
            >
              <Icon 
                name="chevron-back" 
                size={20} 
                color={currentStep === 0 ? colors.border : colors.text} 
              />
              <Text style={[
                styles.navButtonText,
                { color: currentStep === 0 ? colors.border : colors.text }
              ]}>
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: subjectColor }]}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === tutorialSteps.length - 1 ? 'Get Started!' : 'Next'}
              </Text>
              <Icon name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialCard: {
    width: '100%',
    maxWidth: IS_MOBILE ? 340 : 480,
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  emoji: {
    fontSize: 48,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  content: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 32,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});




