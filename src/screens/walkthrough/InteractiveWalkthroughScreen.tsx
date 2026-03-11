import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import { LinearGradient } from 'expo-linear-gradient';
import FlashcardCard from '../../components/FlashcardCard';
import VoiceAnswerModal from '../../components/VoiceAnswerModal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { gamificationService } from '../../services/gamificationService';
import { DEMO_CARDS, type DemoFlashcard, type WalkthroughCardType } from '../../walkthrough/demoWalkthroughData';

const STORAGE_KEY = 'walkthrough_completed_v1';
const WALKTHROUGH_XP = 250;

type StepId = 'topic' | 'cardType' | 'preview' | 'priority' | 'voice' | 'manage' | 'study' | 'done';

const CARD_TYPES: Array<{ id: WalkthroughCardType; title: string; subtitle: string }> = [
  { id: 'multiple_choice', title: 'Multiple choice', subtitle: 'Fast checks and spaced repetition' },
  { id: 'short_answer', title: 'Short answer', subtitle: 'Great for recall + voice feedback' },
  { id: 'essay', title: 'Essay', subtitle: 'Structure and key points' },
  { id: 'acronym', title: 'Acronym', subtitle: 'Memorisation hooks' },
];

const PHOTO_RESULTS = [
  {
    id: 'photo-rate',
    title: 'Photosynthesis',
    location: 'Energy transfers in and between organisms > Photosynthesis',
    level: 'Level 1 Topic',
    match: 'Best Match',
    summary: 'Core photosynthesis processes, inputs/outputs, and energy transfer.',
    highlight: '80% match',
  },
  {
    id: 'photo-limits',
    title: 'Limiting factors of photosynthesis',
    location: 'Energy transfers in and between organisms > Photosynthesis',
    level: 'Level 2 Topic',
    match: 'Strong Match',
    summary: 'How light intensity, CO₂, and temperature affect the rate.',
    highlight: '68% match',
  },
  {
    id: 'photo-structure',
    title: 'Chloroplast structure and pigments',
    location: 'Energy transfers in and between organisms > Photosynthesis',
    level: 'Level 2 Topic',
    match: 'Good Match',
    summary: 'Adaptations of chloroplasts for efficient light capture.',
    highlight: '62% match',
  },
];

const TOPIC_TREE = [
  {
    id: 'c1',
    label: 'Component 1: Energy for Life',
    children: [
      { id: 'c1-1', label: 'Importance of ATP' },
      { id: 'c1-2', label: 'Photosynthesis uses light energy to synthesise organic molecules' },
      { id: 'c1-3', label: 'Respiration releases chemical energy in biological processes' },
    ],
  },
  {
    id: 'c2',
    label: 'Component 2: Continuity of Life',
    children: [
      { id: 'c2-1', label: 'Microbiology' },
      { id: 'c2-2', label: 'Population size and ecosystems' },
      { id: 'c2-3', label: 'Human impact on the environment' },
    ],
  },
];

const TOPIC_TREE_SECTION_COLORS = ['#FBBF24', '#F97316', '#FDBA74'];

const STAGE3_PRIORITY_LEVELS = [
  { value: 1, label: 'Urgent', color: '#FF6B6B', emoji: '🔥' },
  { value: 2, label: 'High Priority', color: '#FF4FD8', emoji: '⚡' },
  { value: 3, label: 'Medium Priority', color: '#FBBF24', emoji: '📌' },
  { value: 4, label: 'Low Priority', color: '#34D399', emoji: '✅' },
];

const STAGE3_BASE_TOPICS = [
  { id: 't-root-1', name: 'Component 1: Energy for Life', level: 0, cards: 5, priority: 1, hasCards: true },
  { id: 't-1', name: 'Importance of ATP', level: 1, cards: 3, priority: 3, hasCards: true },
  { id: 't-2', name: 'Photosynthesis uses light energy to synthesise…', level: 1, cards: 1, priority: 1, hasCards: true },
  { id: 't-3', name: 'Respiration releases chemical energy in biologic…', level: 1, cards: 4, priority: 4, hasCards: true },
  { id: 't-root-2', name: 'Component 2: Continuity of Life', level: 0, cards: 0, priority: null, hasCards: false },
  { id: 't-4', name: 'Microbiology', level: 1, cards: 0, priority: null, hasCards: false },
  { id: 't-5', name: 'Population size and ecosystems', level: 1, cards: 0, priority: null, hasCards: false },
];

export default function InteractiveWalkthroughScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const topicColors = {
    background: '#0b0b12',
    surface: '#131323',
    border: 'rgba(255, 0, 110, 0.28)',
    text: '#FFFFFF',
    textMuted: '#A1A1B5',
    accent: '#FF006E',
    accentSoft: 'rgba(255, 0, 110, 0.14)',
    warn: '#FF006E',
  };

  const [completedBefore, setCompletedBefore] = useState(false);
  const [step, setStep] = useState<StepId>('topic');
  const isTopicStep = step === 'topic';

  const [selectedTopicLabel, setSelectedTopicLabel] = useState('Photosynthesis');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(PHOTO_RESULTS[0]?.id ?? null);
  const [topicSearchStarted, setTopicSearchStarted] = useState(false);
  const [topicResultsScrolled, setTopicResultsScrolled] = useState(false);
  const [topicExpandedOnce, setTopicExpandedOnce] = useState(false);
  const [topicTreeVisible, setTopicTreeVisible] = useState(false);
  const [topicTreeExpanded, setTopicTreeExpanded] = useState<Record<string, boolean>>({ c1: true });
  const [topicCardIndex, setTopicCardIndex] = useState(0);
  const [topicSearchText, setTopicSearchText] = useState('');
  const [topicXpToast, setTopicXpToast] = useState<{ xp: number; message: string } | null>(null);
  const [awardedTopicCards, setAwardedTopicCards] = useState<Record<string, boolean>>({});
  const [topicTreeOpenedOnce, setTopicTreeOpenedOnce] = useState(false);
  const [topicCardHidden, setTopicCardHidden] = useState(false);
  const [stage2Index, setStage2Index] = useState(0);
  const [stage2XpToast, setStage2XpToast] = useState<{ xp: number; message: string } | null>(null);
  const [awardedStage2Cards, setAwardedStage2Cards] = useState<Record<string, boolean>>({});
  const [stage3Index, setStage3Index] = useState(0);
  const [stage3XpToast, setStage3XpToast] = useState<{ xp: number; message: string } | null>(null);
  const [awardedStage3Cards, setAwardedStage3Cards] = useState<Record<string, boolean>>({});
  const [stage3Priority, setStage3Priority] = useState<number | null>(null);
  const [stage3TopicId, setStage3TopicId] = useState<string | null>(null);
  const [stage3PriorityModalVisible, setStage3PriorityModalVisible] = useState(false);
  const [walkthroughCollapsed, setWalkthroughCollapsed] = useState(false);
  const [stage4Index, setStage4Index] = useState(0);
  const [stage4XpToast, setStage4XpToast] = useState<{ xp: number; message: string } | null>(null);
  const [awardedStage4Cards, setAwardedStage4Cards] = useState<Record<string, boolean>>({});
  const [stage4AnswerCorrect, setStage4AnswerCorrect] = useState<boolean | null>(null);
  const [stage4Feedback, setStage4Feedback] = useState<{
    visible: boolean;
    correct: boolean;
    message: string;
    correctAnswer?: string | null;
  }>({ visible: false, correct: true, message: '', correctAnswer: null });
  const [stage4PracticeVisible, setStage4PracticeVisible] = useState(false);
  const [stage4PracticeDone, setStage4PracticeDone] = useState(false);
  const [stage4Difficulty, setStage4Difficulty] = useState<number | null>(null);
  const xpAnim = useRef(new Animated.Value(0)).current;
  const stage3SlideAnim = useRef(new Animated.Value(120)).current;

  const stage3Topics = useMemo(
    () =>
      STAGE3_BASE_TOPICS.map((topic) => {
        if (topic.id === stage3TopicId && stage3Priority) {
          return { ...topic, priority: stage3Priority };
        }
        return topic;
      }),
    [stage3Priority, stage3TopicId]
  );

  const [cardType, setCardType] = useState<WalkthroughCardType>('multiple_choice');
  const [previewCards, setPreviewCards] = useState<DemoFlashcard[]>(() => DEMO_CARDS.multiple_choice.slice(0, 5));
  const [previewIndex, setPreviewIndex] = useState(0);
  const [savedCards, setSavedCards] = useState<DemoFlashcard[]>([]);
  const [priorityById, setPriorityById] = useState<Record<string, number>>({});

  const [voiceDone, setVoiceDone] = useState(false);

  const [studyIndex, setStudyIndex] = useState(0);
  const [studyAnsweredIds, setStudyAnsweredIds] = useState<Set<string>>(new Set());

  const voiceCard = useMemo(() => {
    const essay = DEMO_CARDS.essay[0];
    return {
      question: 'Explain how photosynthesis supports plant growth and survival.',
      answer:
        'Photosynthesis converts light energy into chemical energy stored as glucose. The glucose is used in respiration to release energy for life processes and as a building block for growth (e.g. cellulose and other biomass). Oxygen is released as a by-product.',
      card_type: 'essay' as const,
      key_points: essay.key_points,
      detailed_answer: essay.detailed_answer,
      exam_type: 'alevel',
      box_number: essay.box_number,
      topic: essay.topic,
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

  useEffect(() => {
    if (topicCardIndex === 3) {
      setTopicCardHidden(false);
    }
  }, [topicCardIndex]);

  const resetWalkthrough = () => {
    setStep('topic');
    setSelectedTopicLabel('Photosynthesis');
    setSelectedResultId(PHOTO_RESULTS[0]?.id ?? null);
    setTopicSearchStarted(false);
    setTopicResultsScrolled(false);
    setTopicExpandedOnce(false);
    setTopicTreeVisible(false);
    setTopicTreeExpanded({ c1: true });
    setTopicCardIndex(0);
    setTopicSearchText('');
    setTopicXpToast(null);
    setAwardedTopicCards({});
    setTopicTreeOpenedOnce(false);
    setTopicCardHidden(false);
    setStage2Index(0);
    setStage2XpToast(null);
    setAwardedStage2Cards({});
    setStage3Index(0);
    setStage3XpToast(null);
    setAwardedStage3Cards({});
    setStage3Priority(null);
    setStage3TopicId(null);
    setStage3PriorityModalVisible(false);
    setWalkthroughCollapsed(false);
    setStage4Index(0);
    setStage4XpToast(null);
    setAwardedStage4Cards({});
    setStage4AnswerCorrect(null);
    setStage4Difficulty(null);
    setStage4PracticeDone(false);
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
    const withTopic = base.slice(0, 5).map((c) => ({ ...c, topic: selectedTopicLabel || c.topic }));
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
    setStep('manage');
  };

  const complete = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      if (!completedBefore && user?.id) {
        await gamificationService.upsertUserStatsDelta({
          userId: user.id,
          pointsDelta: WALKTHROUGH_XP,
        });
        setCompletedBefore(true);
      }
    } catch {
      // ignore
    }
    setStep('done');
  };

  const studyCards = useMemo(() => {
    const a = { ...DEMO_CARDS.multiple_choice[0], topic: selectedTopicLabel || 'Demo topic' };
    const b = { ...DEMO_CARDS.multiple_choice[1], topic: selectedTopicLabel || 'Demo topic' };
    return [a, b];
  }, [selectedTopicLabel]);

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

  const infoCopy: Record<StepId, { title: string; lines: string[] }> = {
    topic: {
      title: 'Quick guide',
      lines: [
        'Try this: pick a topic that looks most relevant.',
        'After you do it: you have a starting point for card generation.',
        'This is for: finding the best match fast without browsing.',
        'Great because: you avoid creating cards for the wrong topic.',
      ],
    },
    cardType: {
      title: 'Quick guide',
      lines: [
        'Try this: choose a card type you would use in a real exam.',
        'After you do it: the demo generates 5 cards to review.',
        'This is for: practicing different answer styles.',
        'Great because: you can tailor cards to how marks are awarded.',
      ],
    },
    preview: {
      title: 'Quick guide',
      lines: [
        'Try this: delete any card you would not want to study.',
        'After you do it: you save a clean set of cards.',
        'This is for: quality control before study.',
        'Great because: better cards lead to faster progress.',
      ],
    },
    priority: {
      title: 'Quick guide',
      lines: [
        'Try this: set at least one priority (P1-P4).',
        'After you do it: you can focus revision on what matters.',
        'This is for: planning exam prep under time pressure.',
        'Great because: you do the highest impact cards first.',
      ],
    },
    voice: {
      title: 'Quick guide',
      lines: [
        'Try saying this into the microphone (or try your own answer!).',
        'After you do it: you get AI feedback and a grade band.',
        'This is for: exam practice without typing.',
        'Great because: you build recall speed and confidence.',
      ],
    },
    manage: {
      title: 'Quick guide',
      lines: [
        'Try this: open Manage Cards from Quick Actions.',
        'After you do it: you can review, edit, and prioritise topics.',
        'This is for: keeping revision focused on what matters most.',
        'Great because: priorities guide what you study next.',
      ],
    },
    study: {
      title: 'Quick guide',
      lines: [
        'Try this: answer both cards using Got it / Not quite.',
        'After you do it: the system learns what to show next.',
        'This is for: turning cards into a study habit.',
        'Great because: spaced repetition keeps you exam-ready.',
      ],
    },
    done: {
      title: 'You just earned XP',
      lines: [
        `Nice work. You earned ${WALKTHROUGH_XP} XP for completing the walkthrough.`,
        'This is enough to reach the first System Status level.',
        'Try it now: head to Home and create real cards.',
      ],
    },
  };

  const renderInfoCard = (stepId: StepId) => {
    const info = infoCopy[stepId];
    const isVoice = stepId === 'voice';
    return (
      <View
        style={[
          styles.infoCard,
          { backgroundColor: colors.surface, borderColor: isVoice ? topicColors.accent : colors.border },
        ]}
      >
        <Text style={[styles.infoTitle, { color: colors.text }]}>{info.title}</Text>
        {info.lines.map((line, idx) => (
          <Text key={`${stepId}-${idx}`} style={[styles.infoText, { color: colors.textSecondary }]}>
            {line}
          </Text>
        ))}
      </View>
    );
  };

  const xpTranslate = xpAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -160] });
  const xpOpacity = xpAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });

  const topicCards = [
    {
      id: '1',
      title: 'Welcome to the Interactive FL4SH walkthrough',
      body: "This is a safe demo. It won't change your real cards or progress. Tap continue to begin.",
      type: 'intro' as const,
    },
    {
      id: '2',
      title: 'Find exactly what you need',
      body: 'Tap inside the search box to reveal “photosynthesis”. This shows how your real search works.',
      type: 'search-input' as const,
      xp: 5,
      xpMessage: 'Nice one! 🔍',
    },
    {
      id: '3',
      title: 'Smarter than keyword search',
      body: 'FL4SH understands what you mean, not just what you type. Search "plant energy" and you\'ll still find photosynthesis. It\'s like having a study buddy who actually gets it.',
      type: 'intro' as const,
      xp: 10,
      xpMessage: "You've unlocked Topic Discovery! 🎯",
    },
    {
      id: '4',
      title: 'Prefer to browse?',
      body: 'Tap the menu icon to see every topic for your subject and exam board, neatly organised. Sometimes it\'s easier to explore than search.',
      type: 'icon-tap' as const,
      xp: 5,
      xpMessage: 'Now you know both ways! 📚',
    },
  ];

  const awardTopicXp = async (cardId: string, xp: number, message: string) => {
    if (awardedTopicCards[cardId]) return;
    setAwardedTopicCards((prev) => ({ ...prev, [cardId]: true }));
    showXpToast({ xp, message }, setTopicXpToast);
    if (user?.id) {
      await gamificationService.upsertUserStatsDelta({ userId: user.id, pointsDelta: xp });
    }
  };

  const handleTopicCardAction = async (cardId: string) => {
    if (cardId === '2' && topicCardIndex === 1) {
      await awardTopicXp(cardId, 5, 'Nice one! 🔍');
      setSelectedTopicLabel('Photosynthesis');
      setTopicSearchText('photosynthesis');
      return;
    }
    if (cardId === '3' && topicCardIndex === 2) {
      await awardTopicXp(cardId, 10, "You've unlocked Topic Discovery! 🎯");
      if (!topicSearchStarted) {
        setTopicSearchStarted(true);
      }
      setTopicCardIndex(3);
      return;
    }
    if (cardId === '4' && topicCardIndex === 3) {
      await awardTopicXp(cardId, 5, 'Now you know both ways! 📚');
      setTopicCardIndex(4);
    }
  };

  const renderTopicCoachCard = () => {
    if (topicCardIndex >= topicCards.length) return null;
    const card = topicCards[topicCardIndex];
    if (card.type === 'icon-tap') return null;
    return (
      <Modal visible transparent animationType="slide">
      <View style={styles.walkthroughOverlay}>
          <View style={[
            styles.walkthroughCard,
            styles.walkthroughCardLarge,
            walkthroughCollapsed && styles.walkthroughCardCollapsed,
            { backgroundColor: topicColors.surface, borderColor: topicColors.border },
          ]}>
            <View style={styles.walkthroughAccent} />
            <TouchableOpacity
              style={[styles.walkthroughCollapse, styles.walkthroughCollapseInline]}
              onPress={() => setWalkthroughCollapsed((v) => !v)}
            >
              <Ionicons
                name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={topicColors.textMuted}
              />
              <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
                {walkthroughCollapsed ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>

            {!walkthroughCollapsed && (
              <>
                <Text style={[styles.walkthroughStep, { color: topicColors.textMuted }]}>
                  {topicCardIndex + 1} of {topicCards.length}
                </Text>
                <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
                <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>

                {card.type === 'search-input' && (
                  <TouchableOpacity
                    style={[styles.walkthroughInput, { borderColor: topicColors.border }]}
                    onPress={() => handleTopicCardAction(card.id)}
                  >
                    <Ionicons name="search" size={16} color={topicColors.textMuted} />
                    <Text style={[styles.walkthroughInputText, { color: topicColors.text }]}>
                      {topicSearchText || ''}
                    </Text>
                    <View style={[styles.walkthroughGo, { backgroundColor: topicColors.accent }]}>
                      <Text style={styles.walkthroughGoText}>Go</Text>
                    </View>
                  </TouchableOpacity>
                )}

                <View style={styles.walkthroughActions}>
                  <TouchableOpacity
                    style={[styles.walkthroughSecondary, { borderColor: topicColors.border }]}
                    onPress={() => setTopicCardIndex((i) => Math.max(0, i - 1))}
                    disabled={topicCardIndex === 0}
                  >
                    <Text style={[styles.walkthroughSecondaryText, { color: topicColors.textMuted }]}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.walkthroughPrimary, { backgroundColor: topicColors.accent }]}
                    onPress={async () => {
                      if (card.id === '1') {
                        setTopicCardIndex(1);
                        return;
                      }
                      if (card.id === '2' && topicSearchText) {
                        setTopicCardIndex(2);
                        return;
                      }
                      if (card.id === '3') {
                        await handleTopicCardAction(card.id);
                        return;
                      }
                      if (card.id === '4') {
                        await handleTopicCardAction(card.id);
                      }
                    }}
                    disabled={card.id === '2' && !topicSearchText}
                  >
                    <Text style={styles.walkthroughPrimaryText}>
                      {card.id === '4' ? 'Done' : 'Next'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderInlineTopicCoachCard = () => {
    if (topicCardIndex !== 3) return null;
    if (topicCardHidden) {
      return topicTreeOpenedOnce ? (
        <View style={styles.floatingCtaWrap}>
          <TouchableOpacity
            style={[styles.floatingCta, { backgroundColor: topicColors.accent }]}
            onPress={nextFromTopic}
          >
            <Text style={styles.floatingCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      ) : null;
    }
    const card = topicCards[topicCardIndex];
    return (
      <View pointerEvents="box-none" style={styles.walkthroughBottomWrap}>
        <View style={[
          styles.walkthroughCard,
          styles.walkthroughCardLarge,
          walkthroughCollapsed && styles.walkthroughCardCollapsed,
          { backgroundColor: topicColors.surface, borderColor: topicColors.border },
        ]}>
          <View style={styles.walkthroughAccent} />
          <View style={styles.walkthroughInlineHeader}>
            <TouchableOpacity
              style={styles.walkthroughCollapse}
              onPress={() => setWalkthroughCollapsed((v) => !v)}
            >
              <Ionicons
                name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={topicColors.textMuted}
              />
              <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
                {walkthroughCollapsed ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.walkthroughInlineClose}
              onPress={() => setTopicCardHidden(true)}
            >
              <Text style={[styles.walkthroughInlineCloseText, { color: topicColors.textMuted }]}>Close</Text>
            </TouchableOpacity>
          </View>
          {!walkthroughCollapsed && (
            <>
              <Text style={[styles.walkthroughStep, { color: topicColors.textMuted }]}>
                {topicCardIndex + 1} of {topicCards.length}
              </Text>
              <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
              <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>
              <View style={styles.walkthroughMenuHint}>
                <Ionicons name="list" size={16} color={topicColors.accent} />
                <Text style={[styles.walkthroughHint, { color: topicColors.text }]}>
                  Tap the menu icon to open the topic tree.
                </Text>
              </View>
              {topicTreeOpenedOnce && (
                <TouchableOpacity
                  style={[styles.walkthroughButton, { backgroundColor: topicColors.accent }]}
                  onPress={nextFromTopic}
                >
                  <Text style={styles.walkthroughButtonText}>Continue</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const stage2Cards = [
    {
      id: '2a',
      title: 'Time to create some flashcards',
      body:
        "You've found your topic — now let's turn it into study cards. FL4SH only creates cards from your exact exam specification. No fluff, no off-syllabus surprises. Just what you need to know.",
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 5,
      xpMessage: "Let's build! 🛠️",
    },
    {
      id: '2b',
      title: 'Pick your weapon',
      body:
        'Different card types suit different revision styles. For quick-fire practice with instant answers, Multiple Choice is your friend. Tap it now to create some.',
      type: 'mcq-tap' as const,
      xp: 5,
      xpMessage: 'Good choice! ⚡',
    },
    {
      id: '2c',
      title: 'Building your cards...',
      body: 'FL4SH is crafting questions directly from the specification. This takes a few seconds.',
      type: 'loading' as const,
    },
    {
      id: '2d',
      title: 'Your cards are ready',
      body: "Here they are! Test any card, bin the ones you don't want. Go on — try one.",
      type: 'cards-ready' as const,
      xp: 10,
      xpMessage: 'Cards secured! 💾',
    },
    {
      id: '2e',
      title: "There's more than one way to revise",
      body:
        'Multiple Choice is great for speed. But sometimes you need to dig deeper. Let’s explore the other card types.',
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 5,
      xpMessage: 'Levelling up! 📈',
    },
    {
      id: '2f',
      title: 'Cards that make you think',
      body:
        "Short Answer and Essay cards don't give you options — you have to recall the answer yourself. After studying, you mark whether you got it right. Sounds simple, but this is where real learning happens. Let's create some Essay cards and see something special...",
      type: 'essay-tap' as const,
      xp: 5,
      xpMessage: 'Deep learning unlocked! 🧠',
    },
    {
      id: '2g',
      title: 'Creating Essay cards...',
      body: 'These cards focus on structure and key points — perfect for longer exam answers.',
      type: 'loading' as const,
    },
    {
      id: '2h',
      title: 'Now for the secret weapon',
      body:
        'See that microphone button? One of the most powerful revision techniques — that most students never use — is speaking answers out loud. FL4SH lets you record your answer, then analyses it and gives you feedback. It\'s like having a tutor in your pocket. Give it a go.',
      type: 'voice-reveal' as const,
      buttonText: 'Got it',
      xp: 20,
      xpMessage: 'Voice activated! 🎤',
    },
    {
      id: '2i',
      title: "You're getting the hang of this",
      body:
        'Card generation? Sorted. You know how to build your deck, test cards, and even get AI feedback on spoken answers. Just one more section to go — the fun bit. Actually studying.',
      type: 'action-button' as const,
      buttonText: 'Continue to Stage 3',
      xp: 15,
      xpMessage: 'Stage 2 complete! 🎯',
    },
  ];

  const showXpToast = (payload: { xp: number; message: string }, setter: (v: { xp: number; message: string } | null) => void) => {
    setter(payload);
    xpAnim.setValue(0);
    Animated.timing(xpAnim, { toValue: 1, duration: 1500, useNativeDriver: true }).start(() => {
      setter(null);
    });
  };

  const awardStage2Xp = async (cardId: string, xp: number, message: string) => {
    if (awardedStage2Cards[cardId]) return;
    setAwardedStage2Cards((prev) => ({ ...prev, [cardId]: true }));
    showXpToast({ xp, message }, setStage2XpToast);
    if (user?.id) {
      await gamificationService.upsertUserStatsDelta({ userId: user.id, pointsDelta: xp });
    }
  };

  useEffect(() => {
    if (stage2Index === 2) {
      const t = setTimeout(() => {
        setStep('preview');
        setStage2Index(3);
      }, 1400);
      return () => clearTimeout(t);
    }
    if (stage2Index === 6) {
      const t = setTimeout(() => {
        setStep('voice');
        setStage2Index(7);
      }, 1400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage2Index, setStep]);

  const renderStage2CoachCard = () => {
    if (step !== 'cardType' && step !== 'preview' && step !== 'voice') return null;
    if (step === 'cardType' && stage2Index > 5) return null;
    if (step === 'preview' && (stage2Index < 2 || stage2Index > 3)) return null;
    if (step === 'voice' && stage2Index < 7) return null;
    if (stage2Index === 8 && !voiceDone) return null;

    const card = stage2Cards[stage2Index];
    if (!card) return null;

    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.walkthroughOverlay}>
          <View style={[
            styles.walkthroughCard,
            styles.walkthroughCardLarge,
            walkthroughCollapsed && styles.walkthroughCardCollapsed,
            { backgroundColor: topicColors.surface, borderColor: topicColors.border },
          ]}>
            <View style={styles.walkthroughAccent} />
            <TouchableOpacity
              style={styles.walkthroughCollapse}
              onPress={() => setWalkthroughCollapsed((v) => !v)}
            >
              <Ionicons
                name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={topicColors.textMuted}
              />
              <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
                {walkthroughCollapsed ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
            {!walkthroughCollapsed && (
              <>
                <Text style={[styles.walkthroughStep, { color: topicColors.textMuted }]}>
                  {stage2Index + 1} of {stage2Cards.length}
                </Text>
                <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
                <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>

            {card.type === 'mcq-tap' && (
              <View style={styles.walkthroughIconRow}>
                <TouchableOpacity
                  style={[styles.walkthroughPill, { borderColor: topicColors.border }]}
                  onPress={() => {
                    setCardType('multiple_choice');
                    void awardStage2Xp(card.id, card.xp!, card.xpMessage!);
                    setStage2Index(2);
                  }}
                >
                  <Text style={[styles.walkthroughPillText, { color: topicColors.text }]}>Multiple Choice</Text>
                </TouchableOpacity>
                <Text style={[styles.walkthroughHint, { color: topicColors.textMuted }]}>← Tap this option</Text>
              </View>
            )}

            {card.type === 'essay-tap' && (
              <View style={styles.walkthroughIconRow}>
                <TouchableOpacity
                  style={[styles.walkthroughPill, { borderColor: topicColors.border }]}
                  onPress={() => {
                    setCardType('essay');
                    void awardStage2Xp(card.id, card.xp!, card.xpMessage!);
                    setStage2Index(6);
                  }}
                >
                  <Text style={[styles.walkthroughPillText, { color: topicColors.text }]}>Essay</Text>
                </TouchableOpacity>
                <Text style={[styles.walkthroughHint, { color: topicColors.textMuted }]}>← Tap Essay</Text>
              </View>
            )}

            {card.type === 'cards-ready' && (
              <View style={styles.walkthroughActions}>
                <TouchableOpacity
                  style={[styles.walkthroughSecondary, { borderColor: topicColors.border }]}
                  onPress={() => {
                    void awardStage2Xp(card.id, card.xp!, card.xpMessage!);
                    setStage2Index(4);
                  }}
                >
                  <Text style={[styles.walkthroughSecondaryText, { color: topicColors.textMuted }]}>Try a card</Text>
                </TouchableOpacity>
              </View>
            )}

            {card.type === 'loading' && (
              <View style={styles.walkthroughLoadingRow}>
                <View style={[styles.walkthroughLoadingBar, { backgroundColor: topicColors.accentSoft }]}>
                  <View style={[styles.walkthroughLoadingFill, { backgroundColor: topicColors.accent }]} />
                </View>
                <Text style={[styles.walkthroughHint, { color: topicColors.textMuted }]}>Generating…</Text>
              </View>
            )}

            {(card.type === 'action-button' || card.type === 'voice-reveal') && (
              <TouchableOpacity
                style={[styles.walkthroughButton, { backgroundColor: topicColors.accent }]}
                onPress={() => {
                  if (card.xp && card.xpMessage) void awardStage2Xp(card.id, card.xp, card.xpMessage);
                  if (card.id === '2a') {
                    setStage2Index(1);
                    return;
                  }
                  if (card.id === '2e') {
                    setStage2Index(5);
                    setStep('cardType');
                    return;
                  }
                  if (card.id === '2h') {
                    setStage2Index(8);
                    return;
                  }
                  if (card.id === '2i') {
                    setStage3Index(0);
                    setStep('manage');
                  }
                }}
              >
                <Text style={styles.walkthroughButtonText}>{card.buttonText}</Text>
              </TouchableOpacity>
            )}
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const stage3Cards = [
    {
      id: '3a',
      title: 'Your revision command centre',
      body:
        'Review cards, practise, or add more — it all happens in Manage. Open it by tapping any topic on the homepage, or use Quick Actions. Try it now.',
      type: 'manage-tap' as const,
      xp: 5,
      xpMessage: 'Command centre unlocked! 🎛️',
    },
    {
      id: '3b',
      title: "Here's your topic at a glance",
      body:
        'See your cards, test yourself, or generate more. Want faster progress? Set priorities for this topic. Tap a topic to try it.',
      type: 'topic-tap' as const,
      xp: 5,
      xpMessage: 'Exploring! 🔍',
    },
    {
      id: '3c',
      title: 'Not all topics are equal',
      body:
        'Set a priority from 1 to 4 for each topic. This helps you focus on what matters most, when it matters most. Go on — pick a priority level.',
      type: 'priority-tap' as const,
      xp: 10,
      xpMessage: 'Priority set! 🎯',
    },
    {
      id: '3d',
      title: 'Priority 1 = your weak spots',
      body:
        "Here's a revision hack most students ignore: work on the topics you're worst at, not the ones you enjoy. It's uncomfortable, but it's where the biggest gains are. Priority 1 should be the stuff that makes you squirm a bit.",
      type: 'action-button' as const,
      buttonText: 'Got it',
      xp: 5,
      xpMessage: 'Embracing the struggle! 💪',
    },
    {
      id: '3e',
      title: 'Your homepage, your way',
      body:
        'FL4SH lets you sort topics by priority on your homepage. That way, the important stuff stays front and centre — no hiding from it.',
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 5,
      xpMessage: 'Organised! 📋',
    },
    {
      id: '3f',
      title: "Priorities shift — that's the point",
      body:
        "Every couple of weeks, revisit your priorities. Topics you've smashed? Move them down. New weak spots appearing? Bump them up. Your revision should evolve as you do.",
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 10,
      xpMessage: 'Adaptive learner! 🔄',
    },
    {
      id: '3g',
      title: 'Management sorted',
      body:
        "You know how to find your cards, set priorities, and keep your revision focused on what actually needs work. Now for the moment you've been waiting for — let's actually study.",
      type: 'action-button' as const,
      buttonText: "Let's Study!",
      xp: 15,
      xpMessage: 'Stage 3 complete! Ready to learn! 📚',
    },
  ];

  const awardStage3Xp = async (cardId: string, xp: number, message: string) => {
    if (awardedStage3Cards[cardId]) return;
    setAwardedStage3Cards((prev) => ({ ...prev, [cardId]: true }));
    showXpToast({ xp, message }, setStage3XpToast);
    if (user?.id) {
      await gamificationService.upsertUserStatsDelta({ userId: user.id, pointsDelta: xp });
    }
  };

  const stage4Cards = [
    {
      id: '4a',
      title: 'This is where the magic happens',
      body:
        "Everything you've done so far — finding topics, creating cards, setting priorities — it all leads here. The Study screen is where knowledge actually sticks. Ready to see how it works?",
      type: 'action-button' as const,
      buttonText: 'Show me',
      xp: 5,
      xpMessage: "Let's do this! 🚀",
    },
    {
      id: '4b',
      title: 'Meet your secret weapon: spaced repetition',
      body:
        'FL4SH uses the Leitner method — a proven system that shows you cards at exactly the right time to lock them into long-term memory. All your new cards start in Box 1. This is your everyday box.',
      type: 'action-button' as const,
      buttonText: 'Next',
      xp: 5,
      xpMessage: 'Science-backed! 🔬',
    },
    {
      id: '4c',
      title: 'Get it right, move up',
      body:
        'Answer a card correctly from Box 1 and it moves to Box 2 — your every-other-day box. Get it wrong? It stays in Box 1 until you nail it. Simple.',
      type: 'action-button' as const,
      buttonText: 'Next',
      xp: 5,
      xpMessage: 'Climbing! 📈',
    },
    {
      id: '4d',
      title: 'The path to mastery',
      body:
        "Each correct answer moves a card up a box, earning you more XP as you go. Box 3 is every 3 days. Box 4 is weekly. Box 5? That's the retired box — you've basically mastered those. They'll pop up occasionally just to keep you honest.",
      type: 'action-button' as const,
      buttonText: 'Next',
      xp: 10,
      xpMessage: 'System unlocked! 📦',
    },
    {
      id: '4d2',
      title: 'Your Learning Journey',
      body:
        'Each box has a name in the Study Hub: Box 1 = New, Box 2 = Learning, Box 3 = Growing, Box 4 = Strong, Box 5 = Mastered. You’ll see these labels under “Your Learning Journey”.',
      type: 'action-button' as const,
      buttonText: 'Next',
      xp: 5,
      xpMessage: 'Journey mapped! 🧭',
    },
    {
      id: '4e',
      title: "But here's the thing...",
      body:
        "Get any card wrong — even a Box 4 card you've seen a dozen times — and it drops straight back to Box 1. Harsh? Maybe. Effective? Absolutely. It's how you build bulletproof knowledge.",
      type: 'action-button' as const,
      buttonText: 'Got it',
      xp: 5,
      xpMessage: 'No shortcuts! 💪',
    },
    {
      id: '4f',
      title: 'Time to test yourself',
      body: "Enough theory. Let's try a real card. Answer it and watch where it goes.",
      type: 'practice-card' as const,
    },
    {
      id: '4g-correct',
      title: 'Boom. Nailed it.',
      body:
        "That card just moved up a box. You won't see it again for 2 days now. Your brain will thank you later.",
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 15,
      xpMessage: 'Memory locked! 🔐',
    },
    {
      id: '4g-incorrect',
      title: 'Not quite — but that’s the point',
      body:
        "That card's staying in Box 1. You'll get another crack at it tomorrow. This is exactly how you learn — mistakes today, mastery tomorrow.",
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 10,
      xpMessage: 'Learning in action! 🔄',
    },
    {
      id: '4h',
      title: 'Want more of a challenge?',
      body:
        'You can change the difficulty in your profile. Five modes to match your mood: Safe, Standard, Turbo, Overdrive, Beast Mode. Tap one to preview.',
      type: 'difficulty' as const,
      xp: 10,
      xpMessage: 'Difficulty discovered! ⚡',
    },
    {
      id: '4i',
      title: 'Not ready for the real thing?',
      body:
        "Study mode also lets you preview and practice cards before they're officially due. Think of it as a warm-up — no pressure, no consequences, just extra reps.",
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 5,
      xpMessage: 'Practice makes perfect! 🎯',
    },
    {
      id: '4i2',
      title: 'Pick a Learning Journey box',
      body:
        'Tap one of the boxes under “Your Learning Journey” (any with cards) to open a practice card.',
      type: 'action-button' as const,
      buttonText: 'Continue',
      xp: 10,
      xpMessage: 'Practice complete! 🧠',
    },
    {
      id: '4j',
      title: "You're ready.",
      body:
        "That's everything. You know how to find topics, generate cards, manage your priorities, and study like a pro. Now it's time to build your deck and start learning for real. You've got this.",
      type: 'action-button' as const,
      buttonText: 'Start Revising!',
      xp: 25,
      xpMessage: 'Walkthrough complete! 🏆',
    },
  ];

  const stage4Flow = useMemo(() => {
    const base = stage4Cards.filter((c) => c.id !== '4g-correct' && c.id !== '4g-incorrect');
    const resultCard = stage4Cards.find((c) =>
      c.id === (stage4AnswerCorrect === false ? '4g-incorrect' : '4g-correct')
    );
    const insertIndex = base.findIndex((c) => c.id === '4f');
    if (resultCard && insertIndex >= 0) {
      const next = [...base];
      next.splice(insertIndex + 1, 0, resultCard);
      return next;
    }
    return base;
  }, [stage4AnswerCorrect]);

  const stage4IndexById = useMemo(
    () => new Map(stage4Flow.map((c, idx) => [c.id, idx])),
    [stage4Flow]
  );

  const awardStage4Xp = async (cardId: string, xp: number, message: string) => {
  useEffect(() => {
    if (step !== 'manage' || stage3Index > 2) return;
    stage3SlideAnim.setValue(120);
    Animated.timing(stage3SlideAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [step, stage3Index, stage3SlideAnim]);
    if (awardedStage4Cards[cardId]) return;
    setAwardedStage4Cards((prev) => ({ ...prev, [cardId]: true }));
    showXpToast({ xp, message }, setStage4XpToast);
    if (user?.id) {
      await gamificationService.upsertUserStatsDelta({ userId: user.id, pointsDelta: xp });
    }
  };

  const renderStage3FloatingCard = () => {
    if (step !== 'manage') return null;
    if (stage3Index > 2) return null;
    const card = stage3Cards[stage3Index];
    if (!card) return null;
    return (
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.walkthroughBottomWrap,
          { bottom: 104 },
          { transform: [{ translateY: stage3SlideAnim }] },
        ]}
      >
        <View
          style={[
            styles.walkthroughCard,
            styles.walkthroughCardLarge,
            styles.walkthroughCardStage3,
            walkthroughCollapsed && styles.walkthroughCardCollapsed,
            { backgroundColor: topicColors.surface, borderColor: topicColors.border },
          ]}
        >
          <View style={styles.walkthroughAccent} />
          <TouchableOpacity
            style={styles.walkthroughCollapse}
            onPress={() => setWalkthroughCollapsed((v) => !v)}
          >
            <Ionicons
              name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={topicColors.textMuted}
            />
            <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
              {walkthroughCollapsed ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
          {!walkthroughCollapsed && (
            <>
              <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
              <ScrollView style={styles.walkthroughBodyScroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>
              </ScrollView>
            </>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderStage3CoachCard = () => {
    if (step !== 'manage') return null;
    if (stage3Index < 3) return null;
    const card = stage3Cards[stage3Index];
    if (!card) return null;
    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.walkthroughOverlay}>
          <View style={[
            styles.walkthroughCard,
            styles.walkthroughCardLarge,
            walkthroughCollapsed && styles.walkthroughCardCollapsed,
            { backgroundColor: topicColors.surface, borderColor: topicColors.border },
          ]}>
            <View style={styles.walkthroughAccent} />
            <TouchableOpacity
              style={styles.walkthroughCollapse}
              onPress={() => setWalkthroughCollapsed((v) => !v)}
            >
              <Ionicons
                name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={topicColors.textMuted}
              />
              <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
                {walkthroughCollapsed ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
            {!walkthroughCollapsed && (
              <>
                <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
                <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>

                {card.type === 'action-button' && (
                  <TouchableOpacity
                    style={[styles.walkthroughButton, { backgroundColor: topicColors.accent }]}
                    onPress={() => {
                      if (card.xp && card.xpMessage) void awardStage3Xp(card.id, card.xp, card.xpMessage);
                      if (card.id === '3d') setStage3Index(4);
                      if (card.id === '3e') setStage3Index(5);
                      if (card.id === '3f') setStage3Index(6);
                    if (card.id === '3g') {
                      setStage4Index(0);
                      setStage4AnswerCorrect(null);
                      setStage4Difficulty(null);
                      setStage4PracticeDone(false);
                      setStep('study');
                    }
                    }}
                  >
                    <Text style={styles.walkthroughButtonText}>{card.buttonText}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isTopicStep ? topicColors.background : colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {step === 'topic' && (
          <>
            {renderHeader(
              'Interactive walkthrough',
              'This is a safe demo. It won’t change your real cards or progress.'
            )}
            {renderTopicCoachCard()}
            <View style={[styles.topicDemoShell, { backgroundColor: topicColors.background }]}>
              <View style={styles.topicHeaderRow}>
                <View style={styles.topicHeaderLeft}>
                  <Ionicons name="chevron-back" size={20} color={topicColors.textMuted} />
                  <View>
                    <Text style={[styles.topicHeaderTitle, { color: topicColors.text }]}>Discover Topics</Text>
                    <Text style={[styles.topicHeaderSubtitle, { color: topicColors.textMuted }]}>
                      AQA Biology (A-Level)
                    </Text>
                  </View>
                </View>
                <View style={styles.topicHeaderActions}>
                  <TouchableOpacity
                    style={[styles.topicIconButton, { backgroundColor: topicColors.warn }]}
                    onPress={() => {
                  if (topicCardIndex === 2) {
                    void handleTopicCardAction('3');
                        return;
                      }
                  if (topicCardIndex < 2) return;
                      if (topicSearchStarted) return;
                      setTopicSearchStarted(true);
                    }}
                disabled={topicCardIndex < 2}
                  >
                    <Ionicons name="search" size={16} color="#0a0f1e" />
                  </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.topicIconButton,
                  topicCardIndex === 3 && styles.topicIconButtonHighlight,
                ]}
                onPress={() => {
                  if (topicCardIndex === 3) {
                    void handleTopicCardAction('4');
                  }
                  setTopicTreeOpenedOnce(true);
                  setTopicTreeVisible(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="list" size={18} color={topicCardIndex === 3 ? topicColors.accent : topicColors.text} />
              </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.topicSearchBar, { borderColor: topicColors.border, backgroundColor: topicColors.surface }]}
                onPress={() => {
                  if (topicCardIndex === 1) void handleTopicCardAction('2');
                }}
                activeOpacity={0.9}
              >
                <Ionicons name="search" size={16} color={topicColors.textMuted} />
                <Text style={[styles.topicSearchText, { color: topicColors.text }]}>
                  {topicSearchText || ''}
                </Text>
                <TouchableOpacity style={[styles.topicClearBtn, { borderColor: topicColors.border }]}>
                  <Ionicons name="close" size={14} color={topicColors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>

              <Text style={[styles.topicIntro, { color: topicColors.textMuted }]}>
                Here is an example of what a search for Photosynthesis might show.
              </Text>

              {!topicSearchStarted ? (
                <View style={[styles.topicEmptyCard, { borderColor: topicColors.border }]}>
                  <Text style={[styles.topicEmptyTitle, { color: topicColors.text }]}>Tap search to see results</Text>
                  <Text style={[styles.topicEmptyText, { color: topicColors.textMuted }]}>
                    This is a simulated vector search result for GCSE Biology Edexcel.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.topicFoundText, { color: topicColors.textMuted }]}>
                    Found {PHOTO_RESULTS.length} topic{PHOTO_RESULTS.length === 1 ? '' : 's'}
                  </Text>
                  <ScrollView
                    style={styles.topicResultsScroll}
                    contentContainerStyle={{ paddingBottom: 16 }}
                    showsVerticalScrollIndicator={false}
                    onScroll={(e) => {
                      if (e.nativeEvent.contentOffset.y > 10) {
                        setTopicResultsScrolled(true);
                      }
                    }}
                    scrollEventThrottle={16}
                  >
                    {PHOTO_RESULTS.map((item) => {
                      const expanded = selectedResultId === item.id;
                      const showSummary = expanded || topicExpandedOnce;
                      return (
                        <View key={item.id} style={[styles.topicResultCard, { borderColor: topicColors.border }]}>
                          <View style={styles.topicResultHeader}>
                            <Text style={[styles.topicResultTitle, { color: topicColors.text }]}>{item.title}</Text>
                          <View style={[styles.topicMatchPill, { backgroundColor: topicColors.accent }]}>
                              <Text style={styles.topicMatchText}>{item.match}</Text>
                            </View>
                          </View>
                          <Text style={[styles.topicResultMeta, { color: topicColors.textMuted }]}>
                            Location: {item.location}
                          </Text>
                          <Text style={[styles.topicResultMeta, { color: topicColors.textMuted }]}>{item.level}</Text>
                          {showSummary && (
                            <Text style={[styles.topicResultSummary, { color: topicColors.textMuted }]}>
                              {item.summary}
                            </Text>
                          )}
                          <View style={styles.topicResultFooter}>
                            <View style={[styles.topicScorePill, { backgroundColor: topicColors.accentSoft }]}>
                              <Text style={[styles.topicScoreText, { color: topicColors.accent }]}>{item.highlight}</Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.topicExpandBtn, { borderColor: topicColors.border }]}
                              onPress={() => {
                                setSelectedResultId(item.id);
                                setSelectedTopicLabel(item.title);
                                setTopicExpandedOnce(true);
                              }}
                            >
                              <Text style={[styles.topicExpandText, { color: topicColors.text }]}>
                                {expanded ? 'Selected' : 'Read full summary'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>

          {topicXpToast && (
            <Animated.View
              style={[
                styles.topicXpToast,
                { backgroundColor: topicColors.accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] },
              ]}
            >
              <Text style={styles.topicXpText}>+{topicXpToast.xp} XP</Text>
              <Text style={styles.topicXpMessage}>{topicXpToast.message}</Text>
            </Animated.View>
          )}

            {topicCardIndex !== 3 && (
              <TouchableOpacity
                style={[styles.walkthroughButton, styles.walkthroughButtonTopic, { backgroundColor: topicColors.accent }]}
                onPress={nextFromTopic}
                disabled={!topicSearchStarted}
              >
                <Text style={styles.walkthroughButtonText}>{topicSearchStarted ? 'Continue' : 'Search to continue'}</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {step === 'cardType' && (
          <>
            {renderHeader('Choose a card type', 'We’ll generate 5 demo cards so you can practice the workflow.')}
            {renderInfoCard('cardType')}
            {renderStage2CoachCard()}

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
                    onPress={() => {
                      setCardType(t.id);
                      if (stage2Index === 1 && t.id === 'multiple_choice') {
                        void awardStage2Xp('2b', 5, 'Good choice! ⚡');
                        setStage2Index(2);
                      }
                      if (stage2Index === 5 && t.id === 'essay') {
                        void awardStage2Xp('2f', 5, 'Deep learning unlocked! 🧠');
                        setStage2Index(6);
                      }
                    }}
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
            {renderStage2CoachCard()}

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
                <View style={styles.previewCardWrap}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      if (stage2Index === 3) {
                        void awardStage2Xp('2d', 10, 'Cards secured! 💾');
                        setStage2Index(4);
                      }
                    }}
                  >
                    <View style={styles.previewCardInner}>
                      <FlashcardCard
                        card={{ ...(previewCards[previewIndex] as any), card_type: previewCards[previewIndex].card_type as any }}
                        color={colors.primary}
                        interactionMode="default"
                        showDeleteButton={false}
                      />
                    </View>
                  </TouchableOpacity>
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
            </View>

          </>
        )}

        {step === 'priority' && (
          <>
            {renderHeader('Manage & prioritise', 'Set a priority so you can focus revision on what matters most.')}
            {renderInfoCard('priority')}

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
            {renderStage2CoachCard()}

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.blockTitle, { color: colors.text }]}>5) Try voice feedback</Text>
              <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                This is a demo of the feature. In the main app, voice answers are a Pro feature.
              </Text>
              <View style={[styles.voicePromptCard, { borderColor: topicColors.accent, backgroundColor: 'rgba(255, 0, 110, 0.08)' }]}>
                <Text style={[styles.voicePromptTitle, { color: colors.text }]}>
                  Try saying this into the microphone (or try your own answer!)
                </Text>
                <Text style={[styles.voicePromptQuestion, { color: colors.text }]}>
                  Explain how photosynthesis supports plant growth and survival.
                </Text>
                <Text style={[styles.voicePromptAnswer, { color: colors.textSecondary }]}>
                  Example answer: Photosynthesis converts light energy into glucose. Plants use glucose for respiration and to
                  build biomass (like cellulose), supporting growth and survival. Oxygen is released as a by-product.
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <FlashcardCard
                  card={{ ...(voiceCard as any), card_type: voiceCard.card_type as any }}
                  color={colors.primary}
                  interactionMode="default"
                  showDeleteButton={false}
                  onAnswer={() => setVoiceDone(true)}
                />
              </View>

              <TouchableOpacity style={styles.secondaryBtn} onPress={nextFromVoice}>
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Next</Text>
              </TouchableOpacity>
            </View>

          </>
        )}

        {step === 'manage' && (
          <>
            {renderHeader('Manage your cards', 'Set priorities and keep revision focused.')}
            {renderStage3CoachCard()}

            {stage3Index === 0 && (
              <View style={styles.stage3HomeShell}>
                <Text style={styles.stage3HomeTitle}>Quick Actions</Text>
                <View style={styles.stage3HomeActions}>
                  <TouchableOpacity style={styles.stage3HomeAction}>
                    <Ionicons name="add" size={18} color="#0ea5e9" />
                    <Text style={styles.stage3HomeActionText}>Create Card</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.stage3HomeAction}>
                    <Ionicons name="camera" size={18} color="#22c55e" />
                    <Text style={styles.stage3HomeActionText}>Scan Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stage3HomeAction, styles.stage3HomeActionActive, styles.stage3GlowTarget]}
                    onPress={() => {
                      if (stage3Index === 0) {
                        void awardStage3Xp('3a', 5, 'Command centre unlocked! 🎛️');
                        setStage3Index(1);
                      }
                    }}
                  >
                    <Ionicons name="settings-outline" size={18} color="#f97316" />
                    <Text style={styles.stage3HomeActionText}>Manage Cards</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {stage3Index > 0 && stage3Index < 4 && (
              <View style={styles.manageAllShell}>
                <View style={styles.manageAllHeader}>
                  <TouchableOpacity style={styles.manageAllBack}>
                    <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View>
                    <Text style={styles.manageAllTitle}>Manage All Cards</Text>
                    <Text style={styles.manageAllSubtitle}>Full Curriculum Overview</Text>
                  </View>
                </View>

                <View style={styles.manageAllInfo}>
                  <Ionicons name="information-circle" size={18} color="#7DD3FC" />
                  <Text style={styles.manageAllInfoText}>
                    Set priorities on any topic to plan your study. Topics with cards are highlighted.
                  </Text>
                </View>

                <LinearGradient colors={['#F6B352', '#F08A24']} style={styles.manageAllSubjectHeader}>
                  <View style={styles.manageAllSubjectLeft}>
                    <Text style={styles.manageAllChevron}>▾</Text>
                    <View>
                      <Text style={styles.manageAllSubjectName}>Biology (A-Level)</Text>
                      <Text style={styles.manageAllSubjectMeta}>EDUQAS</Text>
                    </View>
                  </View>
                  <View style={styles.manageAllSubjectBadge}>
                    <Text style={styles.manageAllSubjectBadgeText}>5 cards</Text>
                  </View>
                </LinearGradient>

                <View style={styles.manageAllTree}>
                  {stage3Topics.map((topic) => {
                    const priorityInfo = STAGE3_PRIORITY_LEVELS.find((p) => p.value === topic.priority);
                    const icon = topic.level === 0 ? '📄' : '📁';
                    return (
                      <TouchableOpacity
                        key={topic.id}
                      style={[
                        styles.manageAllRow,
                        topic.hasCards && styles.manageAllRowActive,
                        topic.id === 't-root-1' && stage3Index === 1 && styles.stage3GlowTarget,
                        { paddingLeft: topic.level === 0 ? 12 : 28 },
                      ]}
                        onPress={() => {
                          setStage3TopicId(topic.id);
                          if (stage3Index === 1) {
                            void awardStage3Xp('3b', 5, 'Exploring! 🔍');
                            setStage3Index(2);
                            setStage3PriorityModalVisible(true);
                          }
                        }}
                        disabled={stage3Index !== 1}
                      >
                        <View style={styles.manageAllRowLeft}>
                          <Text style={styles.manageAllIcon}>{icon}</Text>
                          <Text style={styles.manageAllRowText} numberOfLines={1}>
                            {topic.name}
                          </Text>
                        </View>
                        <View style={styles.manageAllRowRight}>
                          <TouchableOpacity
                            style={[
                              styles.manageAllPriority,
                              { backgroundColor: priorityInfo?.color || '#374151' },
                            ]}
                            onPress={() => {
                              setStage3TopicId(topic.id);
                              if (stage3Index === 1) {
                                void awardStage3Xp('3b', 5, 'Exploring! 🔍');
                                setStage3Index(2);
                                setStage3PriorityModalVisible(true);
                              }
                            }}
                            disabled={stage3Index !== 1}
                          >
                            <Text style={styles.manageAllPriorityText}>
                              {priorityInfo?.value ?? '○'}
                            </Text>
                          </TouchableOpacity>
                          {topic.cards > 0 ? (
                            <View style={styles.manageAllCardBadge}>
                              <Text style={styles.manageAllCardBadgeText}>{topic.cards}</Text>
                            </View>
                          ) : (
                            <View style={styles.manageAllAddButton}>
                              <Ionicons name="add" size={16} color="#7DD3FC" />
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {stage3Index >= 4 && (
              <View style={styles.stage3SubjectShell}>
                <View style={styles.stage3SubjectHeaderRow}>
                  <Ionicons name="chevron-back" size={18} color="#64748B" />
                  <View>
                    <Text style={styles.stage3SubjectTitleText}>Biology (A-Level)</Text>
                    <Text style={styles.stage3SubjectSubtitleText}>EDUQAS • A-LEVEL</Text>
                  </View>
                </View>

                <LinearGradient colors={['#F6B352', '#F08A24']} style={styles.stage3SubjectProgress}>
                  <View style={styles.stage3SubjectProgressLeft}>
                    <Text style={styles.stage3SubjectProgressPercent}>0%</Text>
                    <Text style={styles.stage3SubjectProgressLabel}>Complete</Text>
                  </View>
                  <View style={styles.stage3SubjectProgressStat}>
                    <Text style={styles.stage3SubjectProgressValue}>1</Text>
                    <Text style={styles.stage3SubjectProgressLabel}>Topics</Text>
                  </View>
                  <View style={styles.stage3SubjectProgressStat}>
                    <Text style={styles.stage3SubjectProgressValue}>5</Text>
                    <Text style={styles.stage3SubjectProgressLabel}>Cards</Text>
                  </View>
                  <View style={styles.stage3SubjectProgressStat}>
                    <Text style={styles.stage3SubjectProgressValue}>0</Text>
                    <Text style={styles.stage3SubjectProgressLabel}>Mastered</Text>
                  </View>
                </LinearGradient>

                <View style={[styles.stage3SubjectFilterWrap, stage3Index === 4 && styles.stage3SubjectFilterGlow]}>
                  <Text style={styles.stage3SubjectFilterTitle}>FILTER BY PRIORITY</Text>
                  <View style={styles.stage3SubjectFilterRow}>
                    {[
                      { label: 'Everything', value: 0, color: '#CBD5F5' },
                      ...STAGE3_PRIORITY_LEVELS.map((p) => ({ label: p.label, value: p.value, color: p.color })),
                    ].map((item, idx) => (
                      <View key={item.value} style={styles.stage3SubjectFilterItem}>
                        <View style={[styles.stage3SubjectFilterDot, { borderColor: item.color }]}>
                          <Text style={[styles.stage3SubjectFilterDotText, { color: item.color }]}>
                            {idx === 0 ? '' : item.value}
                          </Text>
                        </View>
                        <Text style={styles.stage3SubjectFilterLabel}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.stage3SubjectDiscover}>
                  <Ionicons name="search" size={14} color="#94A3B8" />
                  <Text style={styles.stage3SubjectDiscoverText}>Discover Topics</Text>
                </View>

                <View style={styles.stage3SubjectTopicRow}>
                  <Text style={styles.stage3SubjectTopicName}>Component 1: Energy for Life</Text>
                  <View style={styles.stage3SubjectTopicBadge}>
                    <Text style={styles.stage3SubjectTopicBadgeText}>5</Text>
                  </View>
                </View>
              </View>
            )}

            <Modal visible={stage3PriorityModalVisible} transparent animationType="fade">
              <View style={styles.priorityModalOverlay}>
                <View style={styles.priorityModalCard}>
                  <Text style={styles.priorityModalTitle}>Set Priority</Text>
                  {STAGE3_PRIORITY_LEVELS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.priorityModalButton, { backgroundColor: p.color }]}
                      onPress={() => {
                        setStage3Priority(p.value);
                        setStage3PriorityModalVisible(false);
                        if (stage3Index === 2) {
                          void awardStage3Xp('3c', 10, 'Priority set! 🎯');
                          setStage3Index(3);
                        }
                      }}
                    >
                      <Text style={styles.priorityModalButtonText}>{p.value}</Text>
                      <Text style={styles.priorityModalButtonLabel}>{p.emoji} {p.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.priorityModalClear}
                    onPress={() => setStage3PriorityModalVisible(false)}
                  >
                    <Text style={styles.priorityModalClearText}>Clear Priority</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

          </>
        )}

        {step === 'study' && (
          <>
            {renderHeader('Study mode (quick demo)', 'Answer 2 cards so you experience the flow.')}

            <View style={styles.studyShell}>
              {(() => {
                const activeCard = stage4Flow[stage4Index];
                const isReviewStage = ['4f', '4g-correct', '4g-incorrect', '4h', '4i'].includes(activeCard?.id ?? '');
                return !isReviewStage ? (
                <LinearGradient colors={['#1a1f3a', '#2d3561']} style={styles.studyHubCard}>
                  <View style={styles.studyHubHeader}>
                    <Ionicons name="school" size={22} color="#00D4FF" />
                    <Text style={styles.studyHubTitle}>Study Hub</Text>
                  </View>

                  <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.studyHero}>
                    <View style={styles.studyHeroContent}>
                      <Text style={styles.studyHeroTitle}>Ready to Study?</Text>
                      <Text style={styles.studyHeroCount}>5 cards due today</Text>
                      <Text style={styles.studyHeroSubtitle}>Complete today to keep your streak! 🔥</Text>
                      <TouchableOpacity style={styles.studyHeroButton}>
                        <Text style={styles.studyHeroButtonText}>START REVIEW</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>

                  <View style={styles.studyStats}>
                    <View style={styles.studyStatItem}>
                      <Text style={styles.studyStatValue}>5</Text>
                      <Text style={styles.studyStatLabel}>Total Cards</Text>
                    </View>
                    <View style={styles.studyStatDivider} />
                    <View style={styles.studyStatItem}>
                      <Text style={[styles.studyStatValue, styles.studyStatDue]}>5</Text>
                      <Text style={styles.studyStatLabel}>Due Now</Text>
                    </View>
                  </View>

                  <View style={styles.studyJourney}>
                    <Text style={styles.studyJourneyTitle}>Your Learning Journey</Text>
                    <View style={styles.studyJourneyRow}>
                      {[
                        { label: 'New', count: 5, emoji: '🌱' },
                        { label: 'Learning', count: 0, emoji: '📘' },
                        { label: 'Growing', count: 0, emoji: '🚀' },
                        { label: 'Strong', count: 0, emoji: '💪' },
                        { label: 'Mastered', count: 0, emoji: '🏆' },
                      ].map((item) => (
                        <TouchableOpacity
                          key={item.label}
                          style={[
                            styles.studyJourneyItem,
                            activeCard?.id === '4i2' && item.count > 0 && styles.studyJourneyItemHighlight,
                          ]}
                          disabled={!(activeCard?.id === '4i2' && item.count > 0)}
                          onPress={() => {
                            if (activeCard?.id === '4i2' && item.count > 0) {
                              setStage4PracticeVisible(true);
                              setStage4PracticeDone(true);
                            }
                          }}
                        >
                          <Text style={styles.studyJourneyEmoji}>{item.emoji}</Text>
                          <Text style={styles.studyJourneyCount}>{item.count}</Text>
                          <Text style={styles.studyJourneyLabel}>{item.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.studyReviewCard}>
                  <View style={styles.studyReviewHeader}>
                    <TouchableOpacity style={styles.studyReviewClose}>
                      <Ionicons name="close" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                    <Text style={styles.studyReviewTitle}>Daily Review</Text>
                    <Text style={styles.studyReviewCount}>Card 1/0</Text>
                  </View>

                  <View style={styles.studyReviewPills}>
                    <View style={styles.studyReviewPill}>
                      <Text style={styles.studyReviewPillText}>SAFE • x1.0</Text>
                    </View>
                    <View style={styles.studyReviewPill}>
                      <Text style={styles.studyReviewPillText}>VOICE ON</Text>
                    </View>
                  </View>

                  {stage4Flow[stage4Index]?.id === '4f' && (
                    <View style={styles.studyReviewCardWrap}>
                      <View style={styles.studyReviewCardInner}>
                        <FlashcardCard
                          card={{ ...(studyCurrent as any), card_type: studyCurrent.card_type as any }}
                          color={colors.primary}
                          interactionMode="study"
                          questionClampLines={1}
                          allowQuestionExpand={true}
                          containerStyle={{ height: 560 }}
                          onAnswer={(correct) => {
                            setStage4AnswerCorrect(correct);
                            setStage4Feedback({
                              visible: true,
                              correct,
                              message: correct
                                ? 'Moving to Learning 📘\nReview: every 2 days'
                                : 'Back to New 🌱\nAvailable: Tomorrow',
                              correctAnswer: correct ? null : (studyCurrent.correct_answer || studyCurrent.answer || null),
                            });
                            if (correct) {
                              void awardStage4Xp('4g-correct', 15, 'Memory locked! 🔐');
                            } else {
                              void awardStage4Xp('4g-incorrect', 10, 'Learning in action! 🔄');
                            }
                            setTimeout(() => {
                              setStage4Feedback((prev) => ({ ...prev, visible: false }));
                              const nextId = correct ? '4g-correct' : '4g-incorrect';
                              const base = stage4Cards.filter(
                                (c) => c.id !== '4g-correct' && c.id !== '4g-incorrect'
                              );
                              const resultCard = stage4Cards.find((c) => c.id === nextId);
                              const insertIndex = base.findIndex((c) => c.id === '4f');
                              let nextIndex = -1;
                              if (resultCard && insertIndex >= 0) {
                                const nextFlow = [...base];
                                nextFlow.splice(insertIndex + 1, 0, resultCard);
                                nextIndex = nextFlow.findIndex((c) => c.id === nextId);
                              }
                              if (nextIndex !== undefined) {
                                setStage4Index(nextIndex >= 0 ? nextIndex : stage4Index + 1);
                              }
                            }, 1600);
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {['4h', '4i'].includes(stage4Flow[stage4Index]?.id ?? '') && (
                    <>
                      <Text style={styles.studyReviewSectionTitle}>Difficulty</Text>
                      <View
                        style={[
                          styles.studyReviewDifficultyRow,
                          stage4Flow[stage4Index]?.id === '4h' && styles.studyReviewDifficultyRowHighlight,
                        ]}
                      >
                        {[
                          { value: 1, label: 'Safe' },
                          { value: 2, label: 'Standard' },
                          { value: 3, label: 'Turbo' },
                          { value: 4, label: 'Overdrive' },
                          { value: 5, label: 'Beast' },
                        ].map((d) => (
                          <TouchableOpacity
                            key={d.value}
                            style={[
                              styles.studyReviewDifficultyPill,
                              stage4Difficulty === d.value && styles.studyReviewDifficultyPillActive,
                            ]}
                            onPress={() => {
                              setStage4Difficulty(d.value);
                              if (stage4Flow[stage4Index]?.id === '4h') {
                                void awardStage4Xp('4h', 10, 'Difficulty discovered! ⚡');
                                const nextIndex = stage4IndexById.get('4i');
                                if (nextIndex !== undefined) setStage4Index(nextIndex);
                              }
                            }}
                          >
                            <Text style={styles.studyReviewDifficultyNumber}>{d.value}</Text>
                            <Text style={styles.studyReviewDifficultyLabel}>{d.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                </View>
              );
              })()}
            </View>
          </>
        )}

        {step === 'done' && (
          <>
            <View style={styles.doneWrap}>
              <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.doneCard}>
                <Text style={styles.doneTitle}>Walkthrough complete! 🎉</Text>
                <Text style={styles.doneSubtitle}>
                  You’ve earned {WALKTHROUGH_XP} XP. You can replay this anytime from Profile.
                </Text>
                <View style={styles.doneBadge}>
                  <Text style={styles.doneBadgeText}>+{WALKTHROUGH_XP} XP</Text>
                </View>
                <Text style={styles.doneBody}>
                  You’re ready to start for real. Build your deck, pick priorities, and study like a pro.
                </Text>
                <TouchableOpacity
                  style={styles.doneSecondary}
                  onPress={() => {
                    resetWalkthrough();
                    const parent = (navigation as any).getParent?.();
                    if (parent?.navigate) {
                      parent.navigate('Home');
                      (navigation as any).goBack?.();
                    } else {
                      (navigation as any).navigate('HomeMain' as never);
                    }
                  }}
                >
                  <Text style={styles.doneSecondaryText}>Back to Home</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </>
        )}

        {stage2XpToast && (
          <Animated.View
            style={[
              styles.stageXpToast,
              { backgroundColor: topicColors.accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] },
            ]}
          >
            <Text style={styles.topicXpText}>+{stage2XpToast.xp} XP</Text>
            <Text style={styles.topicXpMessage}>{stage2XpToast.message}</Text>
          </Animated.View>
        )}
        {stage3XpToast && (
          <Animated.View
            style={[
              styles.stageXpToast,
              { backgroundColor: topicColors.accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] },
            ]}
          >
            <Text style={styles.topicXpText}>+{stage3XpToast.xp} XP</Text>
            <Text style={styles.topicXpMessage}>{stage3XpToast.message}</Text>
          </Animated.View>
        )}
        {stage4XpToast && (
          <Animated.View
            style={[
              styles.stageXpToast,
              { backgroundColor: topicColors.accent, opacity: xpOpacity, transform: [{ translateY: xpTranslate }] },
            ]}
          >
            <Text style={styles.topicXpText}>+{stage4XpToast.xp} XP</Text>
            <Text style={styles.topicXpMessage}>{stage4XpToast.message}</Text>
          </Animated.View>
        )}
      </ScrollView>
      {step === 'study' && (() => {
        const index = stage4Index;
        const card = stage4Flow[index];
        if (!card) return null;
        if (card.id === '4i2' && !stage4PracticeDone) {
          // Still show the instruction card, but keep Continue disabled until they practice.
        }
        return (
          <View pointerEvents="box-none" style={styles.walkthroughBottomWrap}>
            <View
              style={[
                styles.walkthroughCard,
                styles.walkthroughCardLarge,
                walkthroughCollapsed && styles.walkthroughCardCollapsed,
                { backgroundColor: topicColors.surface, borderColor: topicColors.border },
              ]}
            >
              <View style={styles.walkthroughAccent} />
              <TouchableOpacity
                style={styles.walkthroughCollapse}
                onPress={() => setWalkthroughCollapsed((v) => !v)}
              >
                <Ionicons
                  name={walkthroughCollapsed ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={topicColors.textMuted}
                />
                <Text style={[styles.walkthroughCollapseText, { color: topicColors.textMuted }]}>
                  {walkthroughCollapsed ? 'Show' : 'Hide'}
                </Text>
              </TouchableOpacity>
              {!walkthroughCollapsed && (
                <>
                  <Text style={[styles.walkthroughStep, { color: topicColors.textMuted }]}>
                    {Math.min(index + 1, stage4Flow.length)} of {stage4Flow.length}
                  </Text>
                  <Text style={[styles.walkthroughTitle, { color: topicColors.text }]}>{card.title}</Text>
                  <Text style={[styles.walkthroughBody, { color: topicColors.textMuted }]}>{card.body}</Text>
                  {card.type === 'action-button' && (
                    <TouchableOpacity
                      style={[
                        styles.walkthroughButton,
                        { backgroundColor: topicColors.accent },
                        card.id === '4i2' && !stage4PracticeDone && styles.walkthroughButtonDisabled,
                      ]}
                      onPress={() => {
                        if (card.id === '4i2' && !stage4PracticeDone) return;
                        if (card.xp && card.xpMessage) void awardStage4Xp(card.id, card.xp, card.xpMessage);
                        if (card.id === '4a') setStage4Index(stage4IndexById.get('4b') ?? 1);
                        if (card.id === '4b') setStage4Index(stage4IndexById.get('4c') ?? 2);
                        if (card.id === '4c') setStage4Index(stage4IndexById.get('4d') ?? 3);
                        if (card.id === '4d') setStage4Index(stage4IndexById.get('4d2') ?? 4);
                        if (card.id === '4d2') setStage4Index(stage4IndexById.get('4e') ?? 5);
                        if (card.id === '4e') setStage4Index(stage4IndexById.get('4f') ?? 6);
                        if (card.id === '4i') {
                          const nextIndex = stage4IndexById.get('4i2');
                          if (nextIndex !== undefined) setStage4Index(nextIndex);
                          setStage4PracticeDone(false);
                        }
                        if (card.id === '4g-correct' || card.id === '4g-incorrect') {
                          setStage4Index(stage4IndexById.get('4h') ?? index + 1);
                        }
                        if (card.id === '4i2') setStage4Index(stage4IndexById.get('4j') ?? index + 1);
                        if (card.id === '4j') void complete();
                      }}
                    >
                      <Text style={styles.walkthroughButtonText}>{card.buttonText}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })()}
      {renderStage3FloatingCard()}
      {renderInlineTopicCoachCard()}
      <Modal visible={stage4PracticeVisible} transparent animationType="fade">
        <View style={styles.stage4PracticeOverlay}>
          <View style={styles.stage4PracticeCard}>
            <View style={styles.stage4PracticeHeader}>
              <Text style={styles.stage4PracticeTitle}>Practice card</Text>
              <TouchableOpacity onPress={() => { setStage4PracticeVisible(false); setStage4PracticeDone(true); }}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.stage4PracticeHighlight}>
              <FlashcardCard
                card={{ ...(studyCurrent as any), card_type: studyCurrent.card_type as any }}
                color={colors.primary}
                interactionMode="study"
                questionClampLines={1}
                allowQuestionExpand={true}
                containerStyle={{ height: 560 }}
                onAnswer={() => {
                  setStage4PracticeVisible(false);
                  setStage4PracticeDone(true);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={stage4Feedback.visible} transparent animationType="none">
        <View style={styles.stage4FeedbackOverlay}>
          <View
            style={[
              styles.stage4FeedbackCard,
              stage4Feedback.correct ? styles.stage4FeedbackCardCorrect : styles.stage4FeedbackCardIncorrect,
            ]}
          >
            <Ionicons
              name={stage4Feedback.correct ? 'checkmark-circle' : 'close-circle'}
              size={56}
              color={stage4Feedback.correct ? '#22C55E' : '#F43F5E'}
            />
            <Text style={styles.stage4FeedbackTitle}>
              {stage4Feedback.correct ? 'Correct!' : 'Not Quite!'}
            </Text>
            <Text style={styles.stage4FeedbackMessage}>{stage4Feedback.message}</Text>
            {stage4Feedback.correctAnswer && (
              <View style={styles.stage4FeedbackAnswerBox}>
                <Text style={styles.stage4FeedbackAnswerLabel}>Correct Answer:</Text>
                <Text style={styles.stage4FeedbackAnswerText}>{stage4Feedback.correctAnswer}</Text>
              </View>
            )}
            <Text style={styles.stage4FeedbackNext}>Next in 2s...</Text>
          </View>
        </View>
      </Modal>
      {step === 'preview' && stage2Index === 4 && (
        <View style={styles.walkthroughBottomWrap}>
          <TouchableOpacity
            style={[styles.floatingCta, { backgroundColor: topicColors.accent }]}
            onPress={() => {
              setStep('cardType');
              setStage2Index(5);
            }}
          >
            <Text style={styles.floatingCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={topicTreeVisible} transparent animationType="fade" onRequestClose={() => setTopicTreeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: topicColors.surface, borderColor: topicColors.border }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.modalTitle, { color: topicColors.text }]}>Topic tree</Text>
                <Text style={[styles.modalSubtitle, { color: topicColors.textMuted }]}>AQA Biology (A-Level)</Text>
              </View>
              <TouchableOpacity onPress={() => setTopicTreeVisible(false)}>
                <Ionicons name="close" size={22} color={topicColors.textMuted as any} />
              </TouchableOpacity>
            </View>
            <View style={styles.topicTreeHint}>
              <Text style={[styles.topicTreeHintText, { color: topicColors.text }]}>
                Tap Component 1 to open the topics.
              </Text>
            </View>
            <View style={[styles.topicTreeSearchBar, { borderColor: topicColors.border }]}>
              <Ionicons name="search" size={14} color={topicColors.textMuted} />
              <Text style={[styles.topicTreeSearchText, { color: topicColors.textMuted }]}>Search topic tree</Text>
            </View>
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {TOPIC_TREE.map((section) => {
                const expanded = topicTreeExpanded[section.id];
                const sectionColor = TOPIC_TREE_SECTION_COLORS[TOPIC_TREE.indexOf(section) % TOPIC_TREE_SECTION_COLORS.length];
                const highlightSection = section.id === 'c1';
                return (
                  <View
                    key={section.id}
                    style={[
                      styles.treeSection,
                      { borderColor: topicColors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
                      highlightSection && styles.treeSectionHighlight,
                    ]}
                  >
                    <TouchableOpacity
                      style={[styles.treeSectionHeader, { backgroundColor: sectionColor }]}
                      onPress={() =>
                        setTopicTreeExpanded((prev) => ({ ...prev, [section.id]: !expanded }))
                      }
                    >
                      <Text style={[styles.treeSectionText, { color: '#1f2937' }]}>{section.label}</Text>
                      <Ionicons
                        name={expanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color="#1f2937"
                      />
                    </TouchableOpacity>
                    {expanded &&
                      section.children.map((child) => (
                        <TouchableOpacity
                          key={child.id}
                          style={[styles.treeItem, { borderColor: topicColors.border }]}
                          onPress={() => {
                            setSelectedTopicLabel(child.label);
                            setTopicTreeVisible(false);
                          }}
                        >
                          <Text style={[styles.treeItemText, { color: topicColors.text }]}>{child.label}</Text>
                        </TouchableOpacity>
                      ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: 16, paddingBottom: 40, flexGrow: 1 },
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
  previewCardWrap: { marginTop: 12 },
  previewCardInner: { transform: [{ scale: 1.04 }] },

  priorityRow: { marginTop: 10, padding: 12, borderWidth: 1, borderRadius: 12, gap: 10 },
  priorityQ: { fontSize: 13, fontWeight: '700' },
  priorityButtons: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  priorityPill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  priorityPillText: { fontSize: 12, fontWeight: '900' },

  infoCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoText: { fontSize: 12, lineHeight: 18, marginBottom: 4 },

  walkthroughCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  walkthroughCardLarge: {
    padding: 22,
    minHeight: '40%',
    maxHeight: '75%',
  },
  walkthroughCardStage3: {
    maxHeight: '68%',
  },
  walkthroughCardCollapsed: {
    paddingVertical: 10,
    maxHeight: 64,
  },
  walkthroughOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  walkthroughBottomWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 6,
  },
  walkthroughAccent: {
    position: 'absolute',
    top: 0,
    left: 18,
    width: 60,
    height: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 110, 0.6)',
  },
  walkthroughStep: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  walkthroughTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  walkthroughBody: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  walkthroughBodyScroll: {
    maxHeight: 180,
  },
  walkthroughCollapse: {
    position: 'absolute',
    right: 12,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  walkthroughCollapseInline: {
    position: 'relative',
    right: undefined,
    top: undefined,
  },
  walkthroughCollapseText: { fontSize: 12, fontWeight: '800' },
  walkthroughInlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  walkthroughInlineClose: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  walkthroughInlineCloseText: { fontSize: 12, fontWeight: '800' },
  walkthroughInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  walkthroughInputText: { flex: 1, fontSize: 14, fontWeight: '700' },
  walkthroughGo: {
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  walkthroughGoText: { color: '#0a0f1e', fontSize: 11, fontWeight: '800' },
  walkthroughButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkthroughButtonTopic: {
    marginBottom: 20,
  },
  walkthroughButtonDisabled: {
    opacity: 0.5,
  },
  walkthroughButtonText: { color: '#0a0f1e', fontWeight: '900', fontSize: 14 },
  walkthroughMenuHint: {
    marginTop: -8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.4)',
    backgroundColor: 'rgba(255, 0, 110, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walkthroughIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walkthroughIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  walkthroughHint: { fontSize: 12, fontWeight: '700' },
  walkthroughPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  walkthroughPillText: { fontSize: 13, fontWeight: '800' },
  walkthroughActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  walkthroughSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  walkthroughSecondaryText: { fontSize: 13, fontWeight: '800' },
  walkthroughPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  walkthroughPrimaryText: { color: '#0a0f1e', fontSize: 13, fontWeight: '900' },
  walkthroughLoadingRow: { gap: 8 },
  walkthroughLoadingBar: { height: 8, borderRadius: 999, overflow: 'hidden' },
  walkthroughLoadingFill: { height: 8, width: '65%', borderRadius: 999 },

  floatingCtaWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  floatingCta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  floatingCtaText: { color: '#0a0f1e', fontSize: 14, fontWeight: '900', letterSpacing: 0.3 },

  manageAllShell: {
    borderRadius: 16,
    backgroundColor: '#0f172a',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.18)',
  },
  manageAllHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  manageAllBack: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  manageAllTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  manageAllSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  manageAllInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    backgroundColor: 'rgba(125, 211, 252, 0.08)',
    marginBottom: 12,
  },
  manageAllInfoText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    flex: 1,
  },
  manageAllSubjectHeader: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  manageAllSubjectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  manageAllChevron: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  manageAllSubjectName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  manageAllSubjectMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  manageAllSubjectBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  manageAllSubjectBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  manageAllTree: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b1224',
  },
  manageAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  manageAllRowActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#00D4FF',
  },
  manageAllRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  manageAllIcon: {
    fontSize: 14,
  },
  manageAllRowText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  manageAllRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageAllPriority: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageAllPriorityText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  manageAllCardBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  manageAllCardBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  manageAllAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(125, 211, 252, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.3)',
  },
  stage3HomeShell: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  stage3HomeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  stage3HomeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stage3HomeAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F2F5',
    borderWidth: 1,
    borderColor: '#D3EEF5',
    gap: 6,
  },
  stage3HomeActionActive: {
    borderColor: '#BEE9F7',
    backgroundColor: '#E5F7FB',
  },
  stage3GlowTarget: {
    borderColor: '#FF006E',
    borderWidth: 2,
    shadowColor: '#FF006E',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  stage3HomeActionText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  stage3SubjectShell: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  stage3SubjectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stage3SubjectTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  stage3SubjectSubtitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  stage3SubjectProgress: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stage3SubjectProgressLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
  },
  stage3SubjectProgressPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stage3SubjectProgressValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stage3SubjectProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  stage3SubjectProgressStat: {
    alignItems: 'center',
    flex: 1,
  },
  stage3SubjectFilterWrap: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  stage3SubjectFilterGlow: {
    borderColor: '#FACC15',
    shadowColor: '#FACC15',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  stage3SubjectFilterTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  stage3SubjectFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  stage3SubjectFilterItem: {
    alignItems: 'center',
    flex: 1,
  },
  stage3SubjectFilterDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  stage3SubjectFilterDotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stage3SubjectFilterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  stage3SubjectDiscover: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  stage3SubjectDiscoverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stage3SubjectTopicRow: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
  },
  stage3SubjectTopicName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  stage3SubjectTopicBadge: {
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  stage3SubjectTopicBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  studyShell: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  studyHubCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  studyHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  studyHubTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  studyHero: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  studyHeroContent: {
    alignItems: 'center',
  },
  studyHeroTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  studyHeroCount: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  studyHeroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  studyHeroButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  studyHeroButtonText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  studyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  studyStatItem: {
    alignItems: 'center',
  },
  studyStatValue: {
    color: '#00D4FF',
    fontSize: 18,
    fontWeight: '900',
  },
  studyStatDue: {
    color: '#FF6B6B',
  },
  studyStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  studyStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  studyJourney: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
  },
  studyJourneyTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  studyJourneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studyJourneyItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: 2,
  },
  studyJourneyEmoji: {
    fontSize: 14,
    marginBottom: 4,
  },
  studyJourneyCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  studyJourneyLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  studyReviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.2)',
    backgroundColor: '#0a0f1e',
    padding: 12,
    minHeight: 620,
  },
  studyReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  studyReviewClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  studyReviewTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  studyReviewCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  studyReviewPills: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 6,
  },
  studyReviewPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.35)',
    backgroundColor: 'rgba(0,245,255,0.08)',
  },
  studyReviewPillText: {
    color: '#00F5FF',
    fontSize: 11,
    fontWeight: '900',
  },
  studyReviewCardWrap: {
    paddingVertical: 2,
  },
  studyReviewCardInner: {
    transform: [{ scale: 0.75 }],
  },
  studyReviewSectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  studyReviewDifficultyRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  studyReviewDifficultyRowHighlight: {
    borderWidth: 1,
    borderColor: '#FF006E',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#FF006E',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  studyJourneyItemHighlight: {
    borderWidth: 1,
    borderColor: '#FF006E',
    shadowColor: '#FF006E',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  stage4PracticeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stage4PracticeCard: {
    width: '92%',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  stage4PracticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stage4PracticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  stage4PracticeHighlight: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    padding: 6,
    backgroundColor: '#FFF7ED',
  },
  studyReviewDifficultyPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  studyReviewDifficultyPillActive: {
    borderColor: 'rgba(0,245,255,0.8)',
    backgroundColor: 'rgba(0,245,255,0.12)',
  },
  studyReviewDifficultyNumber: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  studyReviewDifficultyLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  stage4FeedbackOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
  },
  stage4FeedbackCard: {
    width: '90%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  stage4FeedbackCardCorrect: {
    borderColor: '#22C55E',
  },
  stage4FeedbackCardIncorrect: {
    borderColor: '#F43F5E',
  },
  stage4FeedbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 10,
  },
  stage4FeedbackMessage: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
    color: '#0f172a',
    lineHeight: 20,
  },
  stage4FeedbackAnswerBox: {
    width: '100%',
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  stage4FeedbackAnswerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  stage4FeedbackAnswerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  stage4FeedbackNext: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  doneWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  doneCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  doneTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    textAlign: 'center',
  },
  doneSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  doneBadge: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 0, 110, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.4)',
    marginBottom: 12,
  },
  doneBadgeText: {
    color: '#FF7AB7',
    fontWeight: '900',
    fontSize: 14,
  },
  doneBody: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  donePrimary: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  donePrimaryText: {
    color: '#0a0f1e',
    fontWeight: '900',
    fontSize: 14,
  },
  doneSecondary: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FF006E',
  },
  doneSecondaryText: {
    color: '#0a0f1e',
    fontWeight: '900',
    fontSize: 13,
  },

  manageActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  manageStageWrap: {
    position: 'relative',
  },
  manageStagePad: {
    paddingTop: 140,
  },
  walkthroughFloatingWrap: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 5,
  },
  manageActionCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  manageActionActive: {
    borderColor: 'rgba(255, 0, 110, 0.6)',
    backgroundColor: 'rgba(255, 0, 110, 0.08)',
  },
  manageActionText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  manageTopicRow: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  manageTopicRowActive: {
    borderColor: 'rgba(0,245,255,0.6)',
  },
  manageTopicName: {
    fontSize: 14,
    fontWeight: '800',
  },
  manageTopicMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  managePriorityRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  managePriorityPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  managePriorityPillActive: {
    borderColor: 'rgba(255, 0, 110, 0.8)',
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
  },
  managePriorityNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  managePriorityLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  stage3FilterRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  stage3SubjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  stage3SubjectTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  stage3SubjectSubtitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  stage3StatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    padding: 12,
    marginBottom: 12,
  },
  stage3StatsCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage3StatsPercent: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stage3StatsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  stage3StatBlock: {
    alignItems: 'center',
    flex: 1,
  },
  stage3StatValue: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  stage3StatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
  },
  stage3SectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  stage3FilterPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  stage3FilterPillActive: {
    borderColor: 'rgba(0,245,255,0.8)',
    backgroundColor: 'rgba(0,245,255,0.1)',
  },
  stage3FilterNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stage3FilterNumberActive: {
    color: '#0a0f1e',
  },
  stage3FilterLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  stage3DiscoverRow: {
    marginTop: 10,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderStyle: 'dashed',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stage3DiscoverText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stage3TopicList: {
    marginTop: 12,
    gap: 8,
  },
  stage3TopicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  stage3TopicName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  stage3TopicBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,245,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage3TopicBadgeText: {
    color: '#00F5FF',
    fontWeight: '900',
  },
  priorityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  priorityModalCard: {
    borderRadius: 18,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#1E1E2E',
  },
  priorityModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    color: '#FFFFFF',
  },
  priorityModalButton: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityModalButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  priorityModalButtonLabel: {
    color: '#fff',
    fontWeight: '800',
  },
  priorityModalClear: {
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  priorityModalClearText: {
    color: '#E2E8F0',
    fontWeight: '800',
  },
  stage4DifficultyRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stage4DifficultyPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  stage4DifficultyPillActive: {
    borderColor: 'rgba(0,245,255,0.8)',
    backgroundColor: 'rgba(0,245,255,0.12)',
  },
  stage4DifficultyNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stage4DifficultyLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  stage4PracticeRow: {
    marginTop: 12,
    gap: 10,
  },

  topicDemoShell: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
    flexGrow: 1,
    minHeight: 520,
  },
  topicHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  topicHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicHeaderTitle: { fontSize: 16, fontWeight: '800' },
  topicHeaderSubtitle: { fontSize: 12, marginTop: 2 },
  topicHeaderActions: { flexDirection: 'row', gap: 8 },
  topicIconButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  topicIconButtonHighlight: {
    borderWidth: 2,
    borderColor: '#FF006E',
    shadowColor: '#FF006E',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  topicSearchBar: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  topicSearchText: { flex: 1, fontSize: 14, fontWeight: '700' },
  topicClearBtn: {
    borderWidth: 1,
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIntro: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
  topicEmptyCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topicEmptyTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  topicEmptyText: { fontSize: 12, lineHeight: 16 },
  topicFoundText: { fontSize: 12, marginBottom: 6 },
  topicResultsScroll: { maxHeight: 420 },
  topicResultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topicResultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  topicResultTitle: { flex: 1, fontSize: 14, fontWeight: '800' },
  topicMatchPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFD166',
  },
  topicMatchText: { fontSize: 10, fontWeight: '800', color: '#1f2937' },
  topicResultMeta: { fontSize: 11, marginBottom: 2 },
  topicResultSummary: { fontSize: 12, lineHeight: 16, marginTop: 6 },
  topicResultFooter: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicScorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,245,255,0.2)',
  },
  topicScoreText: { fontSize: 10, fontWeight: '800', color: '#7dd3fc' },
  topicExpandBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  topicExpandText: { fontSize: 11, fontWeight: '800' },

  topicXpToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  stageXpToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  topicXpText: { fontSize: 13, fontWeight: '900', color: '#0a0f1e' },
  topicXpMessage: { fontSize: 12, fontWeight: '600', color: '#0a0f1e' },

  tipOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  tipCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    width: '100%',
  },
  tipTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.6, marginBottom: 6 },
  tipText: { color: '#E2E8F0', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  tipButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tipButtonText: { color: '#0a0f1e', fontWeight: '800' },

  treeSection: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  treeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  treeSectionText: { fontSize: 14, fontWeight: '800' },
  treeSectionHighlight: {
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  topicTreeHint: {
    marginTop: 6,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.35)',
    backgroundColor: 'rgba(255, 0, 110, 0.08)',
  },
  topicTreeHintText: {
    fontSize: 12,
    fontWeight: '700',
  },
  treeItem: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8 },
  treeItemText: { fontSize: 13, fontWeight: '700' },

  voicePrompt: { marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  voiceQ: { fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 16 },
  modalCard: { borderWidth: 1, borderRadius: 14, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modalSubtitle: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  topicTreeSearchBar: {
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topicTreeSearchText: { fontSize: 12, fontWeight: '700' },
  voicePromptCard: { marginTop: 12, borderWidth: 2, borderRadius: 14, padding: 12 },
  voicePromptTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  voicePromptQuestion: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  voicePromptAnswer: { fontSize: 12, lineHeight: 16 },
});

