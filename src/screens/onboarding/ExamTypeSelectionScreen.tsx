import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { ExamTrack, ExamTrackId, getExamTracks } from '../../utils/examTracks';

export default function ExamTypeSelectionScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<0 | 1>(0);
  const [primaryTrack, setPrimaryTrack] = useState<ExamTrackId | null>(null);
  const [secondaryTrack, setSecondaryTrack] = useState<ExamTrackId | null>(null);
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const isCompact = windowHeight < 860;

  const examTypes: ExamTrack[] = useMemo(() => getExamTracks(), []);

  const handleContinue = () => {
    if (step === 0) {
      if (!primaryTrack) return;
      setStep(1);
      return;
    }
    if (!primaryTrack) return;
    navigation.navigate(
      'SubjectSearch' as never,
      { primaryTrack, secondaryTrack: secondaryTrack || null } as never
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 110 + insets.bottom },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 24, color: "#94A3B8" }}>←</Text>
            ) : (
              <Ionicons name="arrow-back" size={24} color="#94A3B8" />
            )}
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 0 ? 'What are you studying for?' : 'Add a second track?'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 0
                ? 'Select your main study track'
                : 'Optional — you can skip this and add it later in your profile'}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {examTypes.map((exam) => (
              <TouchableOpacity
                key={exam.id}
                style={[
                  styles.optionCard,
                  (step === 0 ? primaryTrack === exam.id : secondaryTrack === exam.id) && styles.selectedCard,
                  isCompact && styles.optionCardCompact,
                  isCompact && { width: '48%' },
                  exam.disabled && styles.disabledCard,
                ]}
                onPress={() => {
                  if (exam.disabled) {
                    Alert.alert('Coming soon', `${exam.name} is coming soon. Please pick another option for now.`);
                    return;
                  }
                  if (step === 0) {
                    setPrimaryTrack(exam.id);
                    // Reset secondary if it matches primary
                    if (secondaryTrack === exam.id) setSecondaryTrack(null);
                  } else {
                    if (primaryTrack === exam.id) {
                      Alert.alert('Pick a different track', 'Your second track must be different from your main track.');
                      return;
                    }
                    setSecondaryTrack(exam.id);
                  }
                }}
                activeOpacity={exam.disabled ? 1 : 0.85}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    (step === 0 ? primaryTrack === exam.id : secondaryTrack === exam.id) && styles.selectedText,
                    exam.disabled && styles.disabledText,
                  ]}>
                    {exam.name}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    (step === 0 ? primaryTrack === exam.id : secondaryTrack === exam.id) && styles.selectedDescription,
                    exam.disabled && styles.disabledDescription,
                  ]}>
                    {exam.description}
                  </Text>
                  {exam.comingSoon && (
                    <View style={styles.comingSoonPill}>
                      <Text style={styles.comingSoonText}>COMING SOON</Text>
                    </View>
                  )}
                </View>
                {(step === 0 ? primaryTrack === exam.id : secondaryTrack === exam.id) && (
                  Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 28 }}>✅</Text>
                  ) : (
                    <Ionicons name="checkmark-circle" size={28} color="#00F5FF" />
                  )
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.skipButton]}
              onPress={() => {
                if (!primaryTrack) return;
                navigation.navigate(
                  'SubjectSearch' as never,
                  { primaryTrack, secondaryTrack: null } as never
                );
              }}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (step === 0 ? !primaryTrack : !primaryTrack) && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!primaryTrack}
          >
            <Text style={styles.continueButtonText}>
              {step === 0 ? 'Continue →' : 'Continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 24,
    padding: 8,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionCardCompact: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  selectedCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderColor: '#00F5FF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  selectedText: {
    color: '#00F5FF',
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  selectedDescription: {
    color: '#94A3B8',
  },
  disabledCard: {
    opacity: 0.55,
    borderColor: 'rgba(255, 0, 110, 0.35)',
  },
  disabledText: {
    color: '#CBD5E1',
  },
  disabledDescription: {
    color: '#94A3B8',
  },
  comingSoonPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 0, 110, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.55)',
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#FF006E',
  },
  continueButton: {
    backgroundColor: '#00F5FF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  skipButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.3,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none',
    } : {
      shadowOpacity: 0,
      elevation: 0,
    }),
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
    backgroundColor: '#0a0f1e',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
}); 