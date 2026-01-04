import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { ExamTrack, ExamTrackId, getExamTracks } from '../../utils/examTracks';

export default function ExamTypeSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = (route.params || {}) as {
    mode?: 'profile_add_track';
    initialPrimaryTrack?: ExamTrackId | null;
    initialSecondaryTrack?: ExamTrackId | null;
  };
  const [step, setStep] = useState<0 | 1>(0);
  const [primaryTrack, setPrimaryTrack] = useState<ExamTrackId | null>(null);
  const [secondaryTrack, setSecondaryTrack] = useState<ExamTrackId | null>(null);
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;
  const windowWidth = Dimensions.get('window').width;
  const isCompact = windowHeight < 860;
  const isNarrow = windowWidth < 360;

  const examTypes: ExamTrack[] = useMemo(() => getExamTracks(), []);
  const trackById = useMemo(() => {
    const map = new Map<ExamTrackId, ExamTrack>();
    examTypes.forEach((t) => map.set(t.id, t));
    return map;
  }, [examTypes]);

  const isSelected = (id: ExamTrackId) => (step === 0 ? primaryTrack === id : secondaryTrack === id);

  const accentFor = (id: ExamTrackId) => {
    switch (id) {
      case 'GCSE':
        return { border: 'rgba(0, 245, 255, 0.35)', fill: 'rgba(0, 245, 255, 0.06)' };
      case 'A_LEVEL':
        return { border: 'rgba(0, 245, 255, 0.35)', fill: 'rgba(0, 245, 255, 0.06)' };
      case 'VOCATIONAL_L2':
        return { border: 'rgba(34, 197, 94, 0.35)', fill: 'rgba(34, 197, 94, 0.06)' };
      case 'VOCATIONAL_L3':
        return { border: 'rgba(34, 197, 94, 0.35)', fill: 'rgba(34, 197, 94, 0.06)' };
      case 'SQA_NATIONAL_5':
        return { border: 'rgba(168, 85, 247, 0.35)', fill: 'rgba(168, 85, 247, 0.06)' };
      case 'SQA_HIGHER':
        return { border: 'rgba(168, 85, 247, 0.35)', fill: 'rgba(168, 85, 247, 0.06)' };
      case 'INTERNATIONAL_GCSE':
        return { border: 'rgba(59, 130, 246, 0.35)', fill: 'rgba(59, 130, 246, 0.06)' };
      case 'INTERNATIONAL_A_LEVEL':
        return { border: 'rgba(59, 130, 246, 0.35)', fill: 'rgba(59, 130, 246, 0.06)' };
      case 'IB':
        return { border: 'rgba(255, 0, 110, 0.35)', fill: 'rgba(255, 0, 110, 0.06)' };
      default:
        return { border: 'rgba(255,255,255,0.12)', fill: 'rgba(255,255,255,0.03)' };
    }
  };

  const selectTrack = (id: ExamTrackId) => {
    const t = trackById.get(id);
    if (t?.disabled) {
      Alert.alert('Coming soon', `${t.name} is coming soon. Please pick another option for now.`);
      return;
    }
    if (step === 0) {
      setPrimaryTrack(id);
      if (secondaryTrack === id) setSecondaryTrack(null);
      return;
    }
    if (primaryTrack === id) {
      Alert.alert('Pick a different track', 'Your second track must be different from your main track.');
      return;
    }
    setSecondaryTrack(id);
  };

  const TrackPill = ({
    id,
    fullWidth,
  }: {
    id: ExamTrackId;
    fullWidth?: boolean;
  }) => {
    const t = trackById.get(id);
    if (!t) return null;
    const selected = isSelected(id);
    const accent = accentFor(id);
    const disabled = !!t.disabled;
    return (
      <TouchableOpacity
        style={[
          styles.pill,
          fullWidth && styles.pillFullWidth,
          !fullWidth && styles.pillHalfWidth,
          { borderColor: accent.border, backgroundColor: accent.fill },
          selected && styles.pillSelected,
          selected && { borderColor: '#00F5FF', backgroundColor: 'rgba(0, 245, 255, 0.10)' },
          disabled && styles.pillDisabled,
        ]}
        onPress={() => selectTrack(id)}
        activeOpacity={disabled ? 1 : 0.85}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.pillTitle,
              selected && styles.pillTitleSelected,
              disabled && styles.pillTitleDisabled,
            ]}
            numberOfLines={2}
          >
            {t.name}
          </Text>
          {t.comingSoon && (
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonText}>COMING SOON</Text>
            </View>
          )}
        </View>
        {selected ? (
          Platform.OS === 'web' ? (
            <Text style={{ fontSize: 26 }}>✅</Text>
          ) : (
            <Ionicons name="checkmark-circle" size={26} color="#00F5FF" />
          )
        ) : null}
      </TouchableOpacity>
    );
  };

  // Profile entrypoint: jump straight to "second track" step with primary prefilled.
  useEffect(() => {
    if (params.mode === 'profile_add_track') {
      if (params.initialPrimaryTrack) setPrimaryTrack(params.initialPrimaryTrack);
      if (params.initialSecondaryTrack) setSecondaryTrack(params.initialSecondaryTrack);
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    if (step === 0) {
      if (!primaryTrack) return;
      setStep(1);
      return;
    }
    if (!primaryTrack) return;
    // This screen is used in two places:
    // - Onboarding stack: route name is "SubjectSearch"
    // - Home stack (modal): route name is "SubjectSelection" (we also keep an alias "SubjectSearch")
    (navigation as any).navigate('SubjectSearch', { primaryTrack, secondaryTrack: secondaryTrack || null });
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
                ? 'Select your study tracks'
                : params.mode === 'profile_add_track'
                  ? 'Optional — add a second track so you can study multiple pathways'
                  : 'Optional — you can skip this and add it later in your profile'}
            </Text>
          </View>

          <View style={styles.table}>
            {/* Age headers */}
            <View style={styles.twoColRow}>
              <Text style={styles.colHeading}>14–16 Years Old</Text>
              <Text style={styles.colHeading}>16–19 Years Old</Text>
            </View>

            {/* UK */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>UK Exams</Text>
              <View style={[styles.twoColRow, styles.subHeadRow]}>
                <Text style={styles.subHeading}>Level 2 Qualifications</Text>
                <Text style={styles.subHeading}>Level 3 Qualifications</Text>
              </View>

              <View style={styles.twoColRow}>
                <TrackPill id="GCSE" />
                <TrackPill id="A_LEVEL" />
              </View>

              <View style={styles.twoColRow}>
                <TrackPill id="VOCATIONAL_L2" />
                <TrackPill id="VOCATIONAL_L3" />
              </View>

              <View style={styles.inlineDivider} />
              <Text style={styles.sectionSubTitle}>Scottish Qualifications</Text>

              <View style={styles.twoColRow}>
                <TrackPill id="SQA_NATIONAL_5" />
                <TrackPill id="SQA_HIGHER" />
              </View>
            </View>

            {/* International */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>International Exams</Text>
              <View style={styles.twoColRow}>
                <TrackPill id="INTERNATIONAL_GCSE" />
                <TrackPill id="INTERNATIONAL_A_LEVEL" />
              </View>

              <View style={styles.oneColRow}>
                <TrackPill id="IB" fullWidth />
              </View>
            </View>

            {isNarrow ? (
              <Text style={styles.narrowHint}>
                Tip: If your screen is narrow, scroll for the full table.
              </Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}>
          {step === 1 ? (
            <TouchableOpacity
              style={[styles.skipButton]}
              onPress={() => {
                if (!primaryTrack) return;
                (navigation as any).navigate('SubjectSearch', { primaryTrack, secondaryTrack: null });
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
  table: {
    marginTop: 6,
    marginBottom: 12,
  },
  section: {
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.0,
    color: '#E2E8F0',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionSubTitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  oneColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colHeading: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#94A3B8',
    textAlign: 'center',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  subHeadRow: {
    marginTop: 6,
    marginBottom: 10,
  },
  subHeading: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
  },
  inlineDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 2,
    marginBottom: 12,
  },
  pill: {
    minHeight: 74,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillHalfWidth: {
    flex: 1,
  },
  pillFullWidth: {
    width: '100%',
  },
  pillSelected: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 18px rgba(0, 245, 255, 0.25)' }
      : {
          shadowColor: '#00F5FF',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  pillDisabled: {
    opacity: 0.55,
  },
  pillTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 0.2,
  },
  pillTitleSelected: {
    color: '#00F5FF',
  },
  pillTitleDisabled: {
    color: '#CBD5E1',
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
  narrowHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
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