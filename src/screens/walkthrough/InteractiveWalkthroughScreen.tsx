import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import FlashcardCard from '../../components/FlashcardCard';
import VoiceAnswerModal from '../../components/VoiceAnswerModal';
import { useTheme } from '../../contexts/ThemeContext';
import { DEMO_CARDS, DEMO_TOPICS, type DemoFlashcard, type WalkthroughCardType } from '../../walkthrough/demoWalkthroughData';

const STORAGE_KEY = 'walkthrough_completed_v1';

type StepId = 'topic' | 'cardType' | 'preview' | 'priority' | 'voice' | 'study' | 'done';

const CARD_TYPES: Array<{ id: WalkthroughCardType; title: string; subtitle: string }> = [
  { id: 'multiple_choice', title: 'Multiple choice', subtitle: 'Fast checks and spaced repetition' },
  { id: 'short_answer', title: 'Short answer', subtitle: 'Great for recall + voice feedback' },
  { id: 'essay', title: 'Essay', subtitle: 'Structure and key points' },
  { id: 'acronym', title: 'Acronym', subtitle: 'Memorisation hooks' },
];

function clampPercent(n: number) {
  const v = Math.max(0, Math.min(1, n));
  return `${Math.round(v * 100)}%`;
}

export default function InteractiveWalkthroughScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [completedBefore, setCompletedBefore] = useState(false);

  const [step, setStep] = useState<StepId>('topic');
  const [topicId, setTopicId] = useState<string>(DEMO_TOPICS[0]?.id || 't1');
  const selectedTopic = useMemo(() => DEMO_TOPICS.find((t) => t.id === topicId) || DEMO_TOPICS[0], [topicId]);

  const [cardType, setCardType] = useState<WalkthroughCardType>('multiple_choice');
  const [previewCards, setPreviewCards] = useState<DemoFlashcard[]>(() => DEMO_CARDS.multiple_choice.slice(0, 5));
  const [previewIndex, setPreviewIndex] = useState(0);
  const [savedCards, setSavedCards] = useState<DemoFlashcard[]>([]);
  const [priorityById, setPriorityById] = useState<Record<string, number>>({});

  const [topicListVisible, setTopicListVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);

  const [studyIndex, setStudyIndex] = useState(0);
  const [studyAnsweredIds, setStudyAnsweredIds] = useState<Set<string>>(new Set());

  const voiceCard = useMemo(() => {
    const sa = DEMO_CARDS.short_answer[0];
    return {
      question: sa.question,
      answer: sa.answer,
      card_type: 'short_answer' as const,
      key_points: sa.key_points,
      detailed_answer: sa.detailed_answer,
      exam_type: 'gcse',
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        setCompletedBefore(v === 'true');
      } catch {
        // ignore
      }
    })();
  }, []);

  const resetWalkthrough = () => {
    setStep('topic');
    setTopicId(DEMO_TOPICS[0]?.id || 't1');
    setCardType('multiple_choice');
    setPreviewCards(DEMO_CARDS.multiple_choice.slice(0, 5));
    setPreviewIndex(0);
    setSavedCards([]);
    setPriorityById({});
    setVoiceDone(false);
    setStudyIndex(0);
    setStudyAnsweredIds(new Set());
  };

  const exit = () => {
    if ((navigation as any).canGoBack?.()) {
      (navigation as any).goBack();
      return;
    }
    (navigation as any).navigate('Profile' as never);
  };

  const nextFromTopic = () => setStep('cardType');

  const nextFromType = () => {
    const base = DEMO_CARDS[cardType] || [];
    const withTopic = base.slice(0, 5).map((c) => ({ ...c, topic: selectedTopic?.label || c.topic }));
    setPreviewCards(withTopic);
    setPreviewIndex(0);
    setStep('preview');
  };

  const savePreview = () => {
    if (previewCards.length === 0) {
      Alert.alert('No cards left', 'Please keep at least one card, or go back and choose a different type.');
      return;
    }
    setSavedCards(previewCards);
    setStep('priority');
  };

  const hasAnyPriority = useMemo(() => Object.keys(priorityById).length > 0, [priorityById]);

  const nextFromPriority = () => {
    if (!hasAnyPriority) {
      Alert.alert('Set one priority', 'Pick a priority for at least one card so you see how it works.');
      return;
    }
    setStep('voice');
  };

  const nextFromVoice = () => {
    if (!voiceDone) {
      Alert.alert('Try voice feedback', 'Record one voice answer so you can see the AI feedback.');
      return;
    }
    setStep('study');
  };

  const complete = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setStep('done');
  };

  const studyCards = useMemo(() => {
    const a = { ...DEMO_CARDS.multiple_choice[0], topic: selectedTopic?.label || 'Demo topic' };
    const b = { ...DEMO_CARDS.short_answer[1], topic: selectedTopic?.label || 'Demo topic' };
    return [a, b];
  }, [selectedTopic]);

  const studyCurrent = studyCards[Math.min(studyIndex, studyCards.length - 1)];
  const studyProgress = `${Math.min(studyIndex + 1, studyCards.length)}/${studyCards.length}`;

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <TouchableOpacity onPress={exit} style={styles.exitBtn} accessibilityRole="button" accessibilityLabel="Close walkthrough">
        <Ionicons name="close" size={22} color={colors.textSecondary as any} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {step === 'topic' && (
          <>
            {renderHeader(
              completedBefore ? 'Interactive walkthrough (sandbox)' : 'Interactive walkthrough',
              'This is a safe demo. It won’t change your real cards or progress.'
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>1) Topic discovery (vector search)</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Pick a topic result below (mocked), or tap “Browse topic list” to see the hierarchy alternative.
              </Text>

              {DEMO_TOPICS.map((t) => {
                const active = t.id === topicId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.topicRow,
                      { borderColor: colors.border },
                      active && { borderColor: colors.primary },
                    ]}
                    onPress={() => setTopicId(t.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicTitle, { color: colors.text }]}>{t.label}</Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>
                        Match {clampPercent(t.similarity)} • {t.fullPath}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary as any} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setTopicListVisible(true)}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Browse topic list instead</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromTopic}>
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'cardType' && (
          <>
            {renderHeader('Choose a card type', 'We’ll generate 5 demo cards so you can practice the workflow.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>2) Card types</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                In the real app, you can generate different types per topic. Here you’ll try one, then we’ll demo voice + study.
              </Text>

              {CARD_TYPES.map((t) => {
                const active = t.id === cardType;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeRow,
                      { borderColor: colors.border },
                      active && { borderColor: colors.primary },
                    ]}
                    onPress={() => setCardType(t.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicTitle, { color: colors.text }]}>{t.title}</Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>{t.subtitle}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary as any} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromType}>
              <Text style={styles.primaryBtnText}>Generate 5 demo cards</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'preview' && (
          <>
            {renderHeader('Review & delete', 'Keep what’s good. Delete anything you don’t like before saving.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>3) Preview</Text>
                <Text style={[styles.pill, { color: colors.textSecondary }]}>
                  {previewCards.length > 0 ? `${previewIndex + 1}/${previewCards.length}` : '0/0'}
                </Text>
              </View>

              {previewCards.length === 0 ? (
                <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                  You deleted all cards. Go back and pick a different type.
                </Text>
              ) : (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <FlashcardCard
                    card={{ ...(previewCards[previewIndex] as any), card_type: previewCards[previewIndex].card_type as any }}
                    color={colors.primary}
                    interactionMode="default"
                    showDeleteButton={false}
                  />
                </View>
              )}

              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={previewCards.length === 0 || previewIndex === 0}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    if (previewCards.length === 0) return;
                    const cur = previewCards[previewIndex];
                    setPreviewCards((xs) => xs.filter((c) => c.id !== cur.id));
                    setPreviewIndex((i) => Math.max(0, Math.min(i, previewCards.length - 2)));
                  }}
                  disabled={previewCards.length === 0}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Delete this card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => setPreviewIndex((i) => Math.min(previewCards.length - 1, i + 1))}
                  disabled={previewCards.length === 0 || previewIndex >= previewCards.length - 1}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowBetween}>
              <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setStep('cardType')}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]} onPress={savePreview}>
                <Text style={styles.primaryBtnText}>Save cards</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'priority' && (
          <>
            {renderHeader('Manage & prioritise', 'Set a priority so you can focus revision on what matters most.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>4) Priority (demo)</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Tap a priority on any card. In the real app, you can then filter/search by priority.
              </Text>

              {savedCards.slice(0, 3).map((c) => {
                const p = priorityById[c.id];
                return (
                  <View key={c.id} style={[styles.priorityRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.priorityQ, { color: colors.text }]} numberOfLines={2}>
                        {c.question}
                      </Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>Current: {p ? `P${p}` : 'Not set'}</Text>
                    </View>
                    <View style={styles.priorityButtons}>
                      {[1, 2, 3, 4].map((n) => {
                        const active = p === n;
                        return (
                          <TouchableOpacity
                            key={n}
                            style={[
                              styles.priorityPill,
                              { borderColor: colors.border },
                              active && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                            onPress={() => setPriorityById((prev) => ({ ...prev, [c.id]: n }))}
                          >
                            <Text style={[styles.priorityPillText, { color: active ? '#0a0f1e' : colors.text }]}>P{n}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromPriority}>
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'voice' && (
          <>
            {renderHeader('Voice answers + feedback', 'Speak your answer out loud and get AI feedback.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>5) Try voice feedback</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                This is a demo of the feature. In the main app, voice answers are a Pro feature.
              </Text>
              <View style={[styles.voicePrompt, { borderColor: colors.border }]}>
                <Text style={[styles.voiceQ, { color: colors.text }]}>{voiceCard.question}</Text>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => setVoiceVisible(true)}>
                <Text style={styles.primaryBtnText}>{voiceDone ? 'Try again' : 'Record a voice answer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={nextFromVoice}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Next</Text>
              </TouchableOpacity>
            </View>

            <VoiceAnswerModal
              visible={voiceVisible}
              onClose={() => setVoiceVisible(false)}
              onComplete={() => setVoiceDone(true)}
              card={voiceCard as any}
              color={colors.primary}
            />
          </>
        )}

        {step === 'study' && (
          <>
            {renderHeader('Study mode (quick demo)', 'Answer 2 cards so you experience the flow.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>6) Study</Text>
                <Text style={[styles.pill, { color: colors.textSecondary }]}>{studyProgress}</Text>
              </View>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                You’ll self-assess (“Got it / Not quite”). In the real app, Leitner boxes schedule reviews.
              </Text>

              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <FlashcardCard
                  card={{ ...(studyCurrent as any), card_type: studyCurrent.card_type as any }}
                  color={colors.primary}
                  interactionMode="study"
                  onAnswer={() => {
                    setStudyAnsweredIds((prev) => {
                      const next = new Set(prev);
                      next.add(studyCurrent.id);
                      return next;
                    });
                    setTimeout(() => setStudyIndex((i) => Math.min(studyCards.length - 1, i + 1)), 400);
                  }}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => {
                  const allDone = studyCards.every((c) => studyAnsweredIds.has(c.id));
                  if (!allDone) {
                    Alert.alert('Finish the 2 cards', 'Answer both cards (Got it / Not quite) to complete the demo.');
                    return;
                  }
                  void complete();
                }}
              >
                <Text style={styles.primaryBtnText}>Finish walkthrough</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'done' && (
          <>
            {renderHeader('Walkthrough complete', 'You can replay this any time from Profile.')}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>What next?</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Now do the same flow for real: pick a topic, generate 5 cards, delete any weak ones, then study.
              </Text>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => (navigation as any).navigate('Home' as never)}>
                <Text style={styles.primaryBtnText}>Go to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  resetWalkthrough();
                  exit();
                }}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={resetWalkthrough}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Run again</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={topicListVisible} transparent animationType="fade" onRequestClose={() => setTopicListVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Topic list (demo)</Text>
              <TouchableOpacity onPress={() => setTopicListVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary as any} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.blockText, { color: colors.textSecondary }]}>
              This represents the “browse hierarchy” alternative to vector search.
            </Text>
            {DEMO_TOPICS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.topicRow, { borderColor: colors.border }]}
                onPress={() => {
                  setTopicId(t.id);
                  setTopicListVisible(false);
                }}
              >
                <Text style={[styles.topicTitle, { color: colors.text }]}>{t.fullPath}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  exitBtn: { padding: 8 },

  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  blockTitle: { fontSize: 16, fontWeight: '800' },
  blockText: { marginTop: 6, fontSize: 13, lineHeight: 18 },

  topicRow: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  typeRow: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  topicTitle: { fontSize: 14, fontWeight: '700' },
  topicMeta: { marginTop: 2, fontSize: 12 },

  primaryBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: '#0a0f1e', fontWeight: '900', letterSpacing: 0.5 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: { fontWeight: '800' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { fontSize: 12 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  smallBtnText: { fontSize: 12, fontWeight: '800' },

  priorityRow: { marginTop: 10, padding: 12, borderWidth: 1, borderRadius: 12, gap: 10 },
  priorityQ: { fontSize: 13, fontWeight: '700' },
  priorityButtons: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priorityPill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  priorityPillText: { fontSize: 12, fontWeight: '900' },

  voicePrompt: { marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  voiceQ: { fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 16 },
  modalCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
});

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import FlashcardCard from '../../components/FlashcardCard';
import VoiceAnswerModal from '../../components/VoiceAnswerModal';
import { useTheme } from '../../contexts/ThemeContext';
import { DEMO_CARDS, DEMO_TOPICS, type DemoFlashcard, type WalkthroughCardType } from '../../walkthrough/demoWalkthroughData';

const STORAGE_KEY = 'walkthrough_completed_v1';

type StepId =
  | 'topic'
  | 'cardType'
  | 'preview'
  | 'priority'
  | 'voice'
  | 'study'
  | 'done';

const CARD_TYPES: Array<{ id: WalkthroughCardType; title: string; subtitle: string }> = [
  { id: 'multiple_choice', title: 'Multiple choice', subtitle: 'Fast checks and spaced repetition' },
  { id: 'short_answer', title: 'Short answer', subtitle: 'Great for recall + voice feedback' },
  { id: 'essay', title: 'Essay', subtitle: 'Structure and key points' },
  { id: 'acronym', title: 'Acronym', subtitle: 'Memorisation hooks' },
];

function clampPercent(n: number) {
  const v = Math.max(0, Math.min(1, n));
  return `${Math.round(v * 100)}%`;
}

export default function InteractiveWalkthroughScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [completedBefore, setCompletedBefore] = useState(false);

  const [step, setStep] = useState<StepId>('topic');
  const [topicId, setTopicId] = useState<string>(DEMO_TOPICS[0]?.id || 't1');
  const selectedTopic = useMemo(() => DEMO_TOPICS.find((t) => t.id === topicId) || DEMO_TOPICS[0], [topicId]);

  const [cardType, setCardType] = useState<WalkthroughCardType>('multiple_choice');
  const [previewCards, setPreviewCards] = useState<DemoFlashcard[]>(() => DEMO_CARDS.multiple_choice.slice(0, 5));
  const [previewIndex, setPreviewIndex] = useState(0);
  const [savedCards, setSavedCards] = useState<DemoFlashcard[]>([]);
  const [priorityById, setPriorityById] = useState<Record<string, number>>({});

  const [topicListVisible, setTopicListVisible] = useState(false);
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);

  const [studyIndex, setStudyIndex] = useState(0);
  const [studyAnsweredIds, setStudyAnsweredIds] = useState<Set<string>>(new Set());

  const voiceCard = useMemo(() => {
    // Always use a short answer prompt so the voice demo matches the feature.
    const sa = DEMO_CARDS.short_answer[0];
    return {
      question: sa.question,
      answer: sa.answer,
      card_type: 'short_answer' as const,
      key_points: sa.key_points,
      detailed_answer: sa.detailed_answer,
      exam_type: 'gcse',
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_KEY);
        setCompletedBefore(v === 'true');
      } catch {
        // ignore
      }
    })();
  }, []);

  const resetWalkthrough = () => {
    setStep('topic');
    setTopicId(DEMO_TOPICS[0]?.id || 't1');
    setCardType('multiple_choice');
    setPreviewCards(DEMO_CARDS.multiple_choice.slice(0, 5));
    setPreviewIndex(0);
    setSavedCards([]);
    setPriorityById({});
    setVoiceDone(false);
    setStudyIndex(0);
    setStudyAnsweredIds(new Set());
  };

  const exit = () => {
    if ((navigation as any).canGoBack?.()) {
      (navigation as any).goBack();
      return;
    }
    // Fallback: send user to the Profile tab root
    (navigation as any).navigate('Profile' as never);
  };

  const nextFromTopic = () => {
    setStep('cardType');
  };

  const nextFromType = () => {
    const base = DEMO_CARDS[cardType] || [];
    const withTopic = base.slice(0, 5).map((c) => ({ ...c, topic: selectedTopic?.label || c.topic }));
    setPreviewCards(withTopic);
    setPreviewIndex(0);
    setStep('preview');
  };

  const savePreview = () => {
    if (previewCards.length === 0) {
      Alert.alert('No cards left', 'Please keep at least one card, or go back and choose a different type.');
      return;
    }
    setSavedCards(previewCards);
    setStep('priority');
  };

  const hasAnyPriority = useMemo(() => Object.keys(priorityById).length > 0, [priorityById]);

  const nextFromPriority = () => {
    if (!hasAnyPriority) {
      Alert.alert('Set one priority', 'Pick a priority for at least one card so you see how it works.');
      return;
    }
    setStep('voice');
  };

  const nextFromVoice = () => {
    if (!voiceDone) {
      Alert.alert('Try voice feedback', 'Record one voice answer so you can see the AI feedback.');
      return;
    }
    setStep('study');
  };

  const complete = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    setStep('done');
  };

  const studyCards = useMemo(() => {
    // Study 2 cards for speed; mix types so users see both MCQ and non-MCQ.
    const a = { ...DEMO_CARDS.multiple_choice[0], topic: selectedTopic?.label || 'Demo topic' };
    const b = { ...DEMO_CARDS.short_answer[1], topic: selectedTopic?.label || 'Demo topic' };
    return [a, b];
  }, [selectedTopic]);

  const studyCurrent = studyCards[Math.min(studyIndex, studyCards.length - 1)];
  const studyProgress = `${Math.min(studyIndex + 1, studyCards.length)}/${studyCards.length}`;

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      <TouchableOpacity onPress={exit} style={styles.exitBtn} accessibilityRole="button" accessibilityLabel="Close walkthrough">
        <Ionicons name="close" size={22} color={colors.textSecondary as any} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {step === 'topic' && (
          <>
            {renderHeader(
              completedBefore ? 'Interactive walkthrough (sandbox)' : 'Interactive walkthrough',
              'This is a safe demo. It won’t change your real cards or progress.'
            )}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>1) Topic discovery (vector search)</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Pick a topic result below (mocked), or tap “Browse topic list” to see the hierarchy alternative.
              </Text>

              {DEMO_TOPICS.map((t) => {
                const active = t.id === topicId;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.topicRow,
                      { borderColor: colors.border },
                      active && { borderColor: colors.primary },
                    ]}
                    onPress={() => setTopicId(t.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicTitle, { color: colors.text }]}>{t.label}</Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>
                        Match {clampPercent(t.similarity)} • {t.fullPath}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary as any} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setTopicListVisible(true)}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Browse topic list instead</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromTopic}>
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'cardType' && (
          <>
            {renderHeader('Choose a card type', 'We’ll generate 5 demo cards so you can practice the workflow.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>2) Card types</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                In the real app, you can generate different types per topic. Here you’ll try one, then we’ll demo voice + study.
              </Text>

              {CARD_TYPES.map((t) => {
                const active = t.id === cardType;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeRow,
                      { borderColor: colors.border },
                      active && { borderColor: colors.primary },
                    ]}
                    onPress={() => setCardType(t.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topicTitle, { color: colors.text }]}>{t.title}</Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>{t.subtitle}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={22} color={colors.primary as any} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromType}>
              <Text style={styles.primaryBtnText}>Generate 5 demo cards</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'preview' && (
          <>
            {renderHeader('Review & delete', 'Keep what’s good. Delete anything you don’t like before saving.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>3) Preview</Text>
                <Text style={[styles.pill, { color: colors.textSecondary }]}>{previewCards.length > 0 ? `${previewIndex + 1}/${previewCards.length}` : '0/0'}</Text>
              </View>

              {previewCards.length === 0 ? (
                <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                  You deleted all cards. Go back and pick a different type.
                </Text>
              ) : (
                <View style={{ alignItems: 'center', marginTop: 8 }}>
                  <FlashcardCard
                    card={{
                      ...(previewCards[previewIndex] as any),
                      // FlashcardCard expects manual in union; our demo types align.
                      card_type: previewCards[previewIndex].card_type as any,
                    }}
                    color={colors.primary}
                    interactionMode="default"
                    showDeleteButton={false}
                  />
                </View>
              )}

              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={previewCards.length === 0 || previewIndex === 0}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    if (previewCards.length === 0) return;
                    const cur = previewCards[previewIndex];
                    setPreviewCards((xs) => xs.filter((c) => c.id !== cur.id));
                    setPreviewIndex((i) => Math.max(0, Math.min(i, previewCards.length - 2)));
                  }}
                  disabled={previewCards.length === 0}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Delete this card</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: colors.border }]}
                  onPress={() => setPreviewIndex((i) => Math.min(previewCards.length - 1, i + 1))}
                  disabled={previewCards.length === 0 || previewIndex >= previewCards.length - 1}
                >
                  <Text style={[styles.smallBtnText, { color: colors.text }]}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowBetween}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1 }]}
                onPress={() => setStep('cardType')}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Back</Text>
              </TouchableOpacity>
              <View style={{ width: 12 }} />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={savePreview}
              >
                <Text style={styles.primaryBtnText}>Save cards</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'priority' && (
          <>
            {renderHeader('Manage & prioritise', 'Set a priority so you can focus revision on what matters most.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>4) Priority (demo)</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Tap a priority on any card. In the real app, you can then filter/search by priority.
              </Text>

              {savedCards.slice(0, 3).map((c) => {
                const p = priorityById[c.id];
                return (
                  <View key={c.id} style={[styles.priorityRow, { borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.priorityQ, { color: colors.text }]} numberOfLines={2}>
                        {c.question}
                      </Text>
                      <Text style={[styles.topicMeta, { color: colors.textSecondary }]}>
                        Current: {p ? `P${p}` : 'Not set'}
                      </Text>
                    </View>
                    <View style={styles.priorityButtons}>
                      {[1, 2, 3, 4].map((n) => {
                        const active = p === n;
                        return (
                          <TouchableOpacity
                            key={n}
                            style={[
                              styles.priorityPill,
                              { borderColor: colors.border },
                              active && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                            onPress={() => setPriorityById((prev) => ({ ...prev, [c.id]: n }))}
                          >
                            <Text style={[styles.priorityPillText, { color: active ? '#0a0f1e' : colors.text }]}>P{n}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={nextFromPriority}>
              <Text style={styles.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'voice' && (
          <>
            {renderHeader('Voice answers + feedback', 'Speak your answer out loud and get AI feedback.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>5) Try voice feedback</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                This is a demo of the feature. In the main app, voice answers are a Pro feature.
              </Text>
              <View style={[styles.voicePrompt, { borderColor: colors.border }]}>
                <Text style={[styles.voiceQ, { color: colors.text }]}>{voiceCard.question}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setVoiceVisible(true)}
              >
                <Text style={styles.primaryBtnText}>{voiceDone ? 'Try again' : 'Record a voice answer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={nextFromVoice}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Next</Text>
              </TouchableOpacity>
            </View>

            <VoiceAnswerModal
              visible={voiceVisible}
              onClose={() => setVoiceVisible(false)}
              onComplete={() => {
                setVoiceDone(true);
              }}
              card={voiceCard as any}
              color={colors.primary}
            />
          </>
        )}

        {step === 'study' && (
          <>
            {renderHeader('Study mode (quick demo)', 'Answer 2 cards so you experience the flow.')}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>6) Study</Text>
                <Text style={[styles.pill, { color: colors.textSecondary }]}>{studyProgress}</Text>
              </View>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                You’ll self-assess (“Got it / Not quite”). In the real app, Leitner boxes schedule reviews.
              </Text>

              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <FlashcardCard
                  card={{
                    ...(studyCurrent as any),
                    card_type: studyCurrent.card_type as any,
                  }}
                  color={colors.primary}
                  interactionMode="study"
                  onAnswer={() => {
                    setStudyAnsweredIds((prev) => {
                      const next = new Set(prev);
                      next.add(studyCurrent.id);
                      return next;
                    });
                    setTimeout(() => {
                      setStudyIndex((i) => Math.min(studyCards.length - 1, i + 1));
                    }, 400);
                  }}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => {
                  const allDone = studyCards.every((c) => studyAnsweredIds.has(c.id));
                  if (!allDone) {
                    Alert.alert('Finish the 2 cards', 'Answer both cards (Got it / Not quite) to complete the demo.');
                    return;
                  }
                  void complete();
                }}
              >
                <Text style={styles.primaryBtnText}>Finish walkthrough</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {step === 'done' && (
          <>
            {renderHeader('Walkthrough complete', 'Nice. You can replay this any time from Profile.')}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>What next?</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                Now do the same flow for real: pick a topic, generate 5 cards, delete any weak ones, then study.
              </Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  // Switch to Home tab
                  (navigation as any).navigate('Home' as never);
                }}
              >
                <Text style={styles.primaryBtnText}>Go to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  resetWalkthrough();
                  exit();
                }}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  resetWalkthrough();
                }}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Run again</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={topicListVisible} transparent animationType="fade" onRequestClose={() => setTopicListVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Topic list (demo)</Text>
              <TouchableOpacity onPress={() => setTopicListVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary as any} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.blockText, { color: colors.textSecondary }]}>
              This represents the “browse hierarchy” alternative to vector search.
            </Text>
            {DEMO_TOPICS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.topicRow, { borderColor: colors.border }]}
                onPress={() => {
                  setTopicId(t.id);
                  setTopicListVisible(false);
                }}
              >
                <Text style={[styles.topicTitle, { color: colors.text }]}>{t.fullPath}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18 },
  exitBtn: { padding: 8 },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  blockTitle: { fontSize: 16, fontWeight: '800' },
  blockText: { marginTop: 6, fontSize: 13, lineHeight: 18 },

  topicRow: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  typeRow: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  topicTitle: { fontSize: 14, fontWeight: '700' },
  topicMeta: { marginTop: 2, fontSize: 12 },

  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: { color: '#0a0f1e', fontWeight: '900', letterSpacing: 0.5 },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryBtnText: { fontWeight: '800' },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { fontSize: 12 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  smallBtnText: { fontSize: 12, fontWeight: '800' },

  priorityRow: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  priorityQ: { fontSize: 13, fontWeight: '700' },
  priorityButtons: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priorityPill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  priorityPillText: { fontSize: 12, fontWeight: '900' },

  voicePrompt: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  voiceQ: { fontSize: 14, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '900' },
});

