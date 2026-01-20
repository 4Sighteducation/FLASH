import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  Platform,
  Linking,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { gamificationConfig, getRankForXp } from '../../services/gamificationService';
import SystemStatusRankIcon from '../../components/SystemStatusRankIcon';
import { supabase } from '../../services/supabase';
import { pushNotificationService } from '../../services/pushNotificationService';
import { useUserProfile } from '../../hooks/useUserProfile';
import { navigateToPaywall } from '../../utils/upgradePrompt';
import { getTrackDisplayName, normalizeExamTrackId } from '../../utils/examTracks';
import { getOrCreateUserSettings, updateUserSettings, UserSettings } from '../../services/userSettingsService';
import { showUpgradePrompt } from '../../utils/upgradePrompt';
import { navigate } from '../../navigation/RootNavigation';
import { captureFeedbackScreenshot } from '../../utils/feedbackScreenshot';

type FaqItem = {
  id: string;
  question: string;
  answer: string[];
  bullets?: string[];
  note?: string;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const FAQS: FaqCategory[] = [
  {
    title: 'Getting Started',
    items: [
      {
        id: 'getting-what-is',
        question: 'What is FL4SH?',
        answer: [
          'FL4SH is an AI-powered flashcard app designed specifically for UK students studying GCSEs and A-Levels. Unlike generic flashcard apps, every card is generated directly from your exam board’s official specification — so you only revise what can actually come up in your exam.',
        ],
      },
      {
        id: 'getting-exam-boards',
        question: 'Which exam boards and subjects do you cover?',
        answer: [
          'We cover all major UK exam boards including AQA, Edexcel, OCR, WJEC, and more across a wide range of GCSE and A-Level subjects. When you search for a subject, we’ll show you all available exam board options so you can pick the exact spec you’re studying.',
        ],
      },
      {
        id: 'getting-unknown-board',
        question: "I don't know which exam board I'm on. Can I still use FL4SH?",
        answer: [
          'Yes! When you search for a subject, we show you all available options. If you’re not sure which one is yours, check with your teacher or look at the front of your textbook — it usually says. You can also select multiple specs if you want to compare.',
        ],
      },
      {
        id: 'getting-free',
        question: 'Is FL4SH free?',
        answer: [
          'FL4SH Pro is completely free for your first month — no card required, no catches. After that, you can choose to continue with a monthly or annual subscription, or drop back to the limited free version.',
          'The free version still lets you revise, but Pro unlocks unlimited card generation, all card types, voice feedback, and more. Most students find the Pro features worth it once they’ve tried them.',
        ],
      },
    ],
  },
  {
    title: 'Finding Topics',
    items: [
      {
        id: 'topics-find',
        question: 'How do I find topics to study?',
        answer: ['You have two options:'],
        bullets: [
          'Use the search bar to type any topic — our smart search understands what you mean, not just what you type (so “plant energy” will find photosynthesis).',
          'Tap the menu icon to browse every topic for your subject and exam board, organised by component and section.',
        ],
      },
      {
        id: 'topics-smart-search',
        question: 'What do you mean by “smart search”?',
        answer: [
          'FL4SH uses something called vector search, which matches your query by meaning rather than just keywords. So if you can’t remember the exact name of a topic, just describe it in your own words and we’ll find the right content.',
        ],
        note: "It's like having a study buddy who actually gets what you’re looking for.",
      },
      {
        id: 'topics-best-match',
        question: 'What does “Best Match” mean in search results?',
        answer: [
          'When you search for a topic, we show you a match percentage. “Best Match” highlights the result most closely aligned with your search. The percentage shows how relevant each result is to what you typed.',
        ],
      },
      {
        id: 'topics-all',
        question: 'Can I see all topics for my subject?',
        answer: [
          'Yes. Tap the hamburger menu icon on the Discover Topics screen to open the full topic list for your selected subject and exam board, organised by component and section.',
        ],
      },
    ],
  },
  {
    title: 'Creating Flashcards',
    items: [
      {
        id: 'cards-create',
        question: 'How do I create flashcards?',
        answer: ['FL4SH gives you three ways to create cards:'],
        bullets: [
          'AI Generated — find a topic and let AI create exam-specific flashcards directly from your curriculum.',
          'Create Manually — write your own custom flashcards for any topic.',
          'From Image — take a photo of notes or textbook pages and generate cards using AI.',
        ],
      },
      {
        id: 'cards-why-create',
        question: 'Why should I create my own cards?',
        answer: [
          'Here’s a revision hack backed by science: creating flashcards is almost as valuable as studying them.',
          'When you write your own questions and answers, you’re forcing your brain to process and reorganise information — which strengthens memory before you even start revising. It’s called the generation effect and it’s seriously underrated.',
        ],
      },
      {
        id: 'cards-when-use',
        question: 'When should I use AI Generated vs Create Manually vs From Image?',
        answer: [],
        bullets: [
          'Use AI Generated when you want quick, reliable cards that match your exam spec.',
          'Use Create Manually when you want to reinforce learning by writing cards yourself.',
          'Use From Image when you have notes or worksheets to turn into cards quickly.',
        ],
      },
      {
        id: 'cards-types',
        question: 'What card types are available?',
        answer: ['FL4SH offers four card types:'],
        bullets: [
          'Multiple Choice — quick-fire questions with automatic marking.',
          'Short Answer — recall the answer, then mark yourself correct or incorrect.',
          'Essay — focuses on structure and key points for longer answers.',
          'Acronym — memory hooks and mnemonics to help tricky information stick.',
        ],
      },
      {
        id: 'cards-image',
        question: 'What kind of images work best for “From Image”?',
        answer: [
          'Clear, well-lit photos work best. Handwritten notes, printed textbooks, worksheets, and revision guides all work. Avoid blurry images or photos taken at sharp angles.',
        ],
      },
      {
        id: 'cards-delete',
        question: "Can I delete cards I don't want?",
        answer: [
          'Yes. After generating cards, you can test them, delete any you don’t like, and then save the ones you want to keep to your study deck.',
        ],
      },
    ],
  },
  {
    title: 'Studying & Spaced Repetition',
    items: [
      {
        id: 'study-how',
        question: 'How does studying work in FL4SH?',
        answer: [
          'FL4SH uses the Leitner system — a proven spaced repetition method. Cards move through five boxes based on whether you answer correctly or incorrectly.',
        ],
      },
      {
        id: 'study-boxes',
        question: 'What are the five boxes?',
        answer: [],
        bullets: [
          'Box 1 — Everyday: all new cards start here.',
          'Box 2 — Every Other Day: cards you’ve answered correctly once.',
          'Box 3 — Every 3 Days: getting more familiar now.',
          'Box 4 — Weekly: you know these pretty well.',
          'Box 5 — Retired: mastered cards that pop up occasionally.',
        ],
      },
      {
        id: 'study-wrong',
        question: 'What happens if I get a card wrong?',
        answer: [
          'It goes straight back to Box 1, no matter which box it was in. This is exactly what makes spaced repetition effective.',
        ],
      },
      {
        id: 'study-vs-practice',
        question: "What’s the difference between Study and Practice mode?",
        answer: [
          'Study mode is the real deal — your answers affect which box cards move to, and it follows the spaced repetition schedule.',
          'Practice mode lets you preview and rehearse cards before they’re officially due, with no consequences.',
        ],
      },
      {
        id: 'study-difficulty',
        question: 'What are the difficulty modes?',
        answer: ['FL4SH has five difficulty settings you can change in your profile:'],
        bullets: [
          'Safe Mode — no timer, no shuffle. XP x1.',
          'Standard — shuffle on, timer off. XP x1.1.',
          'Turbo — 30-second timer. XP x1.5.',
          'Overdrive — 15-second timer. XP x2.',
          'Beast Mode — 5 seconds. XP x3.',
        ],
      },
    ],
  },
  {
    title: 'Voice Answers',
    items: [
      {
        id: 'voice-what',
        question: 'What is the voice answer feature?',
        answer: [
          'For Short Answer and Essay cards, you can tap the microphone button and speak your answer out loud. FL4SH will analyse what you said and give you feedback.',
        ],
      },
      {
        id: 'voice-why',
        question: 'Why should I use voice answers?',
        answer: [
          'Speaking answers out loud is one of the most effective revision techniques — and one most students never use.',
        ],
        note:
          'It forces active recall, helps identify gaps in your understanding, and mimics exam conditions where you need to explain things in your own words.',
      },
      {
        id: 'voice-offline',
        question: 'Does voice answer work offline?',
        answer: ['Voice analysis requires an internet connection to process your answer and provide feedback.'],
      },
    ],
  },
  {
    title: 'Managing Cards & Priorities',
    items: [
      {
        id: 'manage-where',
        question: 'Where do I manage my cards?',
        answer: [
          'The Manage section is your revision command centre. Get there by tapping any topic with cards on your homepage, or use the “Manage Cards” button in Quick Actions.',
        ],
      },
      {
        id: 'manage-priority',
        question: 'What is the priority system?',
        answer: [
          'You can assign a priority (1-4) to each topic. This helps you focus on what matters most. Your homepage can be sorted by priority so urgent topics stay front and centre.',
        ],
      },
      {
        id: 'manage-use',
        question: 'How should I use priorities?',
        answer: ['Here’s a revision hack most students ignore:'],
        note:
          'Priority 1 should be your weakest topics — the ones you dislike or find hardest. Working on weak spots rather than staying comfortable is where the biggest gains happen.',
      },
      {
        id: 'manage-change',
        question: 'Should I change priorities over time?',
        answer: [
          'Absolutely. Every couple of weeks, revisit your priorities. Topics you’ve improved on? Move them down. New weak spots appearing? Bump them up.',
        ],
      },
    ],
  },
  {
    title: 'XP & Gamification',
    items: [
      {
        id: 'xp-what',
        question: 'What is XP?',
        answer: [
          'XP (experience points) is FL4SH’s way of rewarding your revision efforts. You earn XP by studying cards, completing the walkthrough, and hitting milestones.',
        ],
      },
      {
        id: 'xp-per-card',
        question: 'How much XP do I earn per card?',
        answer: ['It depends on your difficulty mode:'],
        bullets: [
          'Safe Mode: XP x1',
          'Standard: XP x1.1',
          'Turbo: XP x1.5',
          'Overdrive: XP x2',
          'Beast Mode: XP x3',
        ],
      },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      {
        id: 'account-change',
        question: 'How do I change my subjects or exam boards?',
        answer: [
          'Go to your profile settings to add, remove, or change your selected subjects and exam boards at any time.',
        ],
      },
      {
        id: 'account-devices',
        question: 'Can I use FL4SH on multiple devices?',
        answer: ['Yes. Sign in with the same account and your cards, progress, and settings will sync across devices.'],
      },
      {
        id: 'account-reset',
        question: 'How do I reset my progress?',
        answer: ['Contact support if you need to reset your study progress. Be aware this will move all cards back to Box 1.'],
      },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      {
        id: 'trouble-cards',
        question: "My cards aren't generating. What's wrong?",
        answer: [
          'Check your internet connection — card generation requires online access. If you’re still having issues, try closing and reopening the app, or contact support.',
        ],
      },
      {
        id: 'trouble-subject',
        question: "I can't find my subject or exam board.",
        answer: [
          'We’re constantly expanding our coverage. Use the “Not found the topic you need?” option to request your subject or exam board, and we’ll prioritise adding it.',
        ],
      },
      {
        id: 'trouble-voice',
        question: "Voice answers aren't working.",
        answer: [
          'Make sure you’ve granted FL4SH microphone permissions in your device settings. You also need an internet connection for voice analysis.',
        ],
      },
      {
        id: 'trouble-mistake',
        question: 'I found a mistake in a card. How do I report it?',
        answer: [
          'On any topic, you’ll see a “Not found the topic you need?” prompt. Use this to tell us what’s missing or incorrect and we’ll improve the curriculum. You can also report specific card errors through the app’s feedback option.',
        ],
      },
    ],
  },
  {
    title: 'Contact & Support',
    items: [
      {
        id: 'contact-support',
        question: 'How do I contact support?',
        answer: ['Use the help option in the app menu, or email us at support@fl4shcards.com. We aim to respond within 24 hours.'],
      },
      {
        id: 'contact-feedback',
        question: 'How do I give feedback or suggest features?',
        answer: [
          'We love hearing from students! Use the feedback option in the app or email us at support@fl4shcards.com. Many of our best features have come from user suggestions.',
        ],
      },
      {
        id: 'contact-social',
        question: 'Where can I follow FL4SH for updates?',
        answer: ['Follow us on TikTok and Instagram for revision tips, updates, and student content.'],
      },
    ],
  },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme, colors, setTheme } = useTheme();
  const styles = createStyles(colors);
  const { tier, limits, restorePurchases } = useSubscription();
  const { isAdmin } = useAdminAccess();
  const { profile } = useUserProfile();
  const [totalPoints, setTotalPoints] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);
  const [userInfo, setUserInfo] = useState<{
    exam_type?: string | null;
    primary_exam_type?: string | null;
    secondary_exam_type?: string | null;
    username?: string | null;
  } | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [draftUsername, setDraftUsername] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [difficultyVisible, setDifficultyVisible] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [parentInviteVisible, setParentInviteVisible] = useState(false);
  const [parentInviteEmail, setParentInviteEmail] = useState('');
  const [sendingParentInvite, setSendingParentInvite] = useState(false);
  const [faqVisible, setFaqVisible] = useState(false);
  const [expandedFaqIds, setExpandedFaqIds] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: true,
    subscription: false,
    settings: false,
    faqs: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadUserPoints() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_stats')
        .select('total_points')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.warn('[Profile] Failed to load user_stats.total_points', error);
        return;
      }
      setTotalPoints(data?.total_points ?? 0);
    }
    loadUserPoints();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);
  
  useEffect(() => {
    let cancelled = false;
    async function loadUserInfo() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('users')
        .select('exam_type, primary_exam_type, secondary_exam_type, username')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.warn('[Profile] Failed to load users row', error);
        return;
      }
      setUserInfo(data ?? null);
    }
    loadUserInfo();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    loadNotificationPreferences();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      if (!user?.id) return;
      const s = await getOrCreateUserSettings(user.id);
      if (cancelled) return;
      setUserSettings(s);
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const themeUnlocks = gamificationConfig.themeUnlocks;
  const canUsePulse = totalPoints >= themeUnlocks.pulse;
  const canUseAurora = totalPoints >= themeUnlocks.aurora;
  const canUseSingularity = totalPoints >= themeUnlocks.singularity;

  const themeOptions: Array<{
    key: 'default' | 'pulse' | 'aurora' | 'singularity';
    name: string;
    requiredXp: number;
    unlocked: boolean;
  }> = [
    { key: 'default', name: 'Default', requiredXp: 0, unlocked: true },
    { key: 'pulse', name: 'Pulse', requiredXp: themeUnlocks.pulse, unlocked: canUsePulse },
    { key: 'aurora', name: 'Aurora', requiredXp: themeUnlocks.aurora, unlocked: canUseAurora },
    { key: 'singularity', name: 'Singularity', requiredXp: themeUnlocks.singularity, unlocked: canUseSingularity },
  ];

  const loadNotificationPreferences = async () => {
    try {
      const [pushNotif, inAppNotif] = await Promise.all([
        AsyncStorage.getItem('notificationsEnabled'),
        AsyncStorage.getItem('inAppNotificationsEnabled')
      ]);
      
      if (pushNotif !== null) {
        setNotificationsEnabled(pushNotif === 'true');
      }
      if (inAppNotif !== null) {
        setInAppNotificationsEnabled(inAppNotif === 'true');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const tierRank = (t: string) => (t === 'pro' || t === 'premium' ? 2 : 0);
  const canUseDifficultyMode = tierRank(tier) >= 2;

  // Open Difficulty modal if requested via navigation param
  useEffect(() => {
    const params: any = (route as any)?.params;
    if (params?.openDifficulty === true && canUseDifficultyMode) {
      setDifficultyVisible(true);
      navigation.setParams({ openDifficulty: undefined } as any);
    }
  }, [route, navigation, canUseDifficultyMode]);

  // Open Parent Invite modal if requested via navigation param (Free plan CTA)
  useEffect(() => {
    const params: any = (route as any)?.params;
    if (params?.openParentInvite === true) {
      setParentInviteVisible(true);
      navigation.setParams({ openParentInvite: undefined } as any);
    }
  }, [route, navigation]);

  useEffect(() => {
    const params: any = (route as any)?.params;
    if (params?.openFaq === true) {
      setFaqVisible(true);
      navigation.setParams({ openFaq: undefined } as any);
    }
  }, [route, navigation]);

  const handleSendParentInvite = async () => {
    const email = parentInviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid parent/guardian email address.');
      return;
    }

    setSendingParentInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-parent', {
        body: { parentEmail: email },
      });

      if (error) {
        const msg = (error as any)?.message || 'Failed to send invite';
        Alert.alert('Could not send invite', msg);
        return;
      }

      // Edge Functions can return 200 with ok:false, so handle both.
      if (data?.ok === false) {
        Alert.alert('Could not send invite', data?.error || 'Failed to send invite');
        return;
      }

      Alert.alert('Invite sent!', 'We’ve emailed your parent/guardian instructions to unlock Pro for your account.');
      setParentInviteVisible(false);
      setParentInviteEmail('');
    } catch (e: any) {
      Alert.alert('Could not send invite', String(e?.message || e));
    } finally {
      setSendingParentInvite(false);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
      if (user?.id) {
        // Keep server-side prefs in sync for scheduled pushes
        await pushNotificationService.upsertPreferences({
          userId: user.id,
          pushEnabled: value,
        });
      }

      if (value) {
        if (!user?.id) {
          Alert.alert('Login Required', 'Please log in to enable push notifications.');
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notificationsEnabled', 'false');
          return;
        }

        const reg = await pushNotificationService.registerForPushNotifications();
        if (!reg.ok) {
          Alert.alert('Notifications Disabled', reg.reason);
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notificationsEnabled', 'false');
          await pushNotificationService.upsertPreferences({
            userId: user.id,
            pushEnabled: false,
          });
          return;
        }

        await pushNotificationService.upsertPushToken({
          userId: user.id,
          expoPushToken: reg.expoPushToken,
          enabled: true,
        });
      }

      setNotificationsEnabled(value);
    } catch (error) {
      console.error('Error saving notification preference:', error);
      Alert.alert('Error', 'Failed to update notification settings. Please try again.');
    }
  };

  const handleInAppNotificationToggle = async (value: boolean) => {
    setInAppNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('inAppNotificationsEnabled', value.toString());
    } catch (error) {
      console.error('Error saving in-app notification preference:', error);
    }
  };

  const handleLogout = () => {
    // RN-web Alert can be unreliable; use a browser confirm for web.
    if (Platform.OS === 'web') {
      const ok =
        typeof globalThis !== 'undefined' && (globalThis as any).window?.confirm
          ? (globalThis as any).window.confirm('Are you sure you want to logout?')
          : true;
      if (ok) void signOut();
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => void signOut(), style: 'destructive' },
    ]);
  };

  const handleSelectTheme = async (next: 'default' | 'pulse' | 'aurora' | 'singularity') => {
    const option = themeOptions.find((t) => t.key === next);
    if (!option) return;
    if (!option.unlocked) {
      Alert.alert('Theme locked', `Unlock ${option.name} at ${option.requiredXp.toLocaleString()} XP.`);
      return;
    }
    setTheme(next);
  };

  type DifficultyKey = 'safe' | 'standard' | 'turbo' | 'overdrive' | 'beast';
  const DIFFICULTY_PRESETS: Array<{
    key: DifficultyKey;
    name: string;
    tagline: string;
    shuffle: boolean;
    timerSeconds: number;
    xpMultiplier: number;
    // gating
    minTier: 'pro';
  }> = [
    // Per your request: Difficulty Mode is a Pro-only feature.
    // Safe Mode equals the current behavior (no shuffle, no timer).
    { key: 'safe', name: 'Safe Mode', tagline: 'Training wheels. No judgement.', shuffle: false, timerSeconds: 0, xpMultiplier: 1.0, minTier: 'pro' },
    { key: 'standard', name: 'Standard', tagline: 'Normal operating conditions.', shuffle: true, timerSeconds: 0, xpMultiplier: 1.1, minTier: 'pro' },
    { key: 'turbo', name: 'Turbo', tagline: 'Picking up the pace.', shuffle: true, timerSeconds: 30, xpMultiplier: 1.5, minTier: 'pro' },
    { key: 'overdrive', name: 'Overdrive', tagline: 'For the ambitious.', shuffle: true, timerSeconds: 15, xpMultiplier: 2.0, minTier: 'pro' },
    { key: 'beast', name: 'Beast Mode', tagline: 'No mercy. No hints. No excuses.', shuffle: true, timerSeconds: 5, xpMultiplier: 3.0, minTier: 'pro' },
  ];
  const currentDifficulty: DifficultyKey = (() => {
    const s = userSettings;
    if (!s) return 'safe';
    const timer = Number(s.answer_timer_seconds || 0);
    const shuffle = !!s.shuffle_mcq_enabled;
    if (!shuffle && timer === 0) return 'safe';
    if (shuffle && timer === 0) return 'standard';
    if (shuffle && timer === 30) return 'turbo';
    if (shuffle && timer === 15) return 'overdrive';
    if (shuffle && timer === 5) return 'beast';
    // fallback
    return 'standard';
  })();

  const applyDifficulty = async (key: DifficultyKey) => {
    if (!user?.id) return;
    const preset = DIFFICULTY_PRESETS.find((p) => p.key === key);
    if (!preset) return;

    const allowed = canUseDifficultyMode && tierRank(tier) >= tierRank(preset.minTier);
    if (!allowed) {
      showUpgradePrompt({
        title: 'Upgrade required',
        message: `Upgrade to unlock ${preset.name}.`,
        ctaLabel: 'View plans',
      });
      return;
    }

    const next = await updateUserSettings(user.id, {
      shuffle_mcq_enabled: preset.shuffle,
      answer_timer_seconds: preset.timerSeconds,
      grace_seconds: 3,
      time_bank_seconds: 0,
    });
    setUserSettings(next);
    setDifficultyVisible(false);
  };

  const getExamTypeDisplay = (examType: string) => {
    // Mirror HomeScreen mapping for consistency
    const types: { [key: string]: string } = {
      gcse: 'GCSE',
      igcse: 'iGCSE',
      alevel: 'A-Level',
      ialev: 'iA-Level',
      GCSE: 'GCSE',
      INTERNATIONAL_GCSE: 'iGCSE',
      A_LEVEL: 'A-Level',
      INTERNATIONAL_A_LEVEL: 'iA-Level',
      VOCATIONAL_L2: 'Vocational Level 2',
      VOCATIONAL_L3: 'Vocational Level 3',
      SQA_NATIONALS: 'Scottish Nationals',
      SQA_NATIONAL_5: 'Scottish National 5',
      SQA_HIGHER: 'Scottish Higher',
      IB: 'International Baccalaureate',
    };
    return types[examType] || examType || 'Not set';
  };

  const openEditProfile = () => {
    const currentUsername = userInfo?.username || (user?.user_metadata as any)?.username || '';
    setDraftUsername(currentUsername);
    setEditVisible(true);
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    const nextUsername = draftUsername.trim();
    if (!nextUsername) {
      Alert.alert('Username required', 'Please enter a username.');
      return;
    }
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: nextUsername })
        .eq('id', user.id);

      if (error) throw error;

      // Keep Auth metadata in sync (best-effort)
      try {
        await supabase.auth.updateUser({ data: { username: nextUsername } });
      } catch (e) {
        console.warn('[Profile] auth.updateUser failed (non-fatal)', e);
      }

      setUserInfo((prev) => ({ ...(prev || {}), username: nextUsername }));
      setEditVisible(false);
    } catch (e: any) {
      console.error('[Profile] saveProfile failed', e);
      Alert.alert('Error', e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const primaryTrack = normalizeExamTrackId(userInfo?.primary_exam_type || userInfo?.exam_type || null);
  const secondaryTrack = normalizeExamTrackId(userInfo?.secondary_exam_type || null);
  const examTracksLabel = primaryTrack
    ? secondaryTrack
      ? `${getTrackDisplayName(primaryTrack)} + ${getTrackDisplayName(secondaryTrack)}`
      : getTrackDisplayName(primaryTrack)
    : getExamTypeDisplay((userInfo?.exam_type || '') as any);

  const examBoardsLabel = profile?.exam_boards?.length ? profile.exam_boards.join(', ') : 'Not set';

  const subjectsLabel =
    profile?.subjects?.length
      ? (() => {
          const top = profile.subjects.slice(0, 3).map((s) => s.subject_name);
          const extra = profile.subjects.length - top.length;
          return extra > 0 ? `${top.join(', ')} (+${extra} more)` : top.join(', ');
        })()
      : 'Not set';

  const profileItems = [
    { icon: 'person-outline', label: 'Username', value: userInfo?.username || (user?.user_metadata as any)?.username || 'Not set' },
    { icon: 'mail-outline', label: 'Email', value: user?.email || 'Not set' },
    { icon: 'school-outline', label: 'Exam track(s)', value: examTracksLabel || 'Not set' },
    { icon: 'git-network', label: 'Exam board(s)', value: examBoardsLabel },
    { icon: 'book', label: 'Subjects', value: subjectsLabel },
    { icon: 'calendar-outline', label: 'Member Since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.faqFloatingButton} onPress={() => setFaqVisible(true)}>
        <Text style={styles.faqFloatingButtonText}>?</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {(() => {
            const rank = getRankForXp(totalPoints);
            return (
              <View style={[styles.avatar, { borderColor: rank.current.color }]}>
                <SystemStatusRankIcon rankKey={rank.current.key} size={96} withContainerGlow={false} />
              </View>
            );
          })()}
          <Text style={styles.name}>{userInfo?.username || (user?.user_metadata as any)?.username || 'Student'}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={openEditProfile}>
            <Icon name="create-outline" size={18} color={colors.text} />
            <Text style={styles.editProfileButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <TouchableOpacity
              style={styles.sectionHeaderLeft}
              onPress={() => setExpandedSections((prev) => ({ ...prev, profile: !prev.profile }))}
            >
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={styles.sectionSummary}>
                {userInfo?.username || 'Student'} • {examTracksLabel || 'No exam track'}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.smallLinkButton}
                onPress={() =>
                  (navigation as any).navigate('ExamTypeSelection', {
                    mode: 'profile_add_track',
                    initialPrimaryTrack: primaryTrack,
                    initialSecondaryTrack: secondaryTrack,
                  })
                }
              >
                <Text style={styles.smallLinkButtonText}>Add exam track</Text>
                <Icon name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Ionicons
                name={expandedSections.profile ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </View>
          {expandedSections.profile &&
            profileItems.map((item, index) => (
              <View key={index} style={styles.infoRow}>
                <Icon name={item.icon} size={22} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderToggle}
            onPress={() => setExpandedSections((prev) => ({ ...prev, subscription: !prev.subscription }))}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Subscription</Text>
              <Text style={styles.sectionSummary}>
                {tier === 'free' ? `Free • ${limits.maxSubjects} subjects` : 'Pro active'}
              </Text>
            </View>
            <Ionicons
              name={expandedSections.subscription ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {expandedSections.subscription && (
            <View style={styles.subscriptionStatus}>
              <View style={styles.subscriptionInfo}>
                <Text style={styles.subscriptionTier}>
                  {tier === 'free' ? 'Free' : 'Pro'}
                </Text>
                {tier === 'free' && (
                  <Text style={styles.subscriptionLimits}>
                    • {limits.maxSubjects} Subject{'\n'}
                    • {limits.maxTopicsPerSubject} Topic{'\n'}
                    • {limits.maxCards} Cards Maximum
                  </Text>
                )}
              </View>
              <>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigateToPaywall()}
                >
                  <Icon name="star" size={20} color="#fff" />
                  <Text style={styles.upgradeButtonText}>
                    {tier === 'free' ? 'View plans' : 'Manage / View plans'}
                  </Text>
                </TouchableOpacity>

                {tier === 'free' && (
                  <TouchableOpacity
                    style={styles.manageStoreButton}
                    onPress={() => setParentInviteVisible(true)}
                  >
                    <Text style={styles.manageStoreButtonText}>Invite parent / guardian</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.restoreButton} onPress={restorePurchases}>
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.manageStoreButton}
                  onPress={() => (navigation as any).navigate('RedeemCode', { code: '' })}
                >
                  <Text style={styles.manageStoreButtonText}>Redeem code</Text>
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.manageStoreButton}
                    onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                  >
                    <Text style={styles.manageStoreButtonText}>Manage in App Store</Text>
                  </TouchableOpacity>
                )}

                {Platform.OS === 'android' && (
                  <TouchableOpacity
                    style={styles.manageStoreButton}
                    onPress={() => Linking.openURL('https://play.google.com/store/account/subscriptions')}
                  >
                    <Text style={styles.manageStoreButtonText}>Manage in Google Play</Text>
                  </TouchableOpacity>
                )}
              </>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderToggle}
            onPress={() => setExpandedSections((prev) => ({ ...prev, settings: !prev.settings }))}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <Text style={styles.sectionSummary}>Notifications • Themes • Difficulty</Text>
            </View>
            <Ionicons
              name={expandedSections.settings ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          
          {expandedSections.settings && (
            <>
          {/* Difficulty Mode */}
          {canUseDifficultyMode ? (
            <TouchableOpacity style={styles.settingRow} onPress={() => setDifficultyVisible(true)}>
              <Icon name="rocket-outline" size={22} color={colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.settingText}>Difficulty mode</Text>
                <Text style={styles.settingHintBelow}>
                  {DIFFICULTY_PRESETS.find((p) => p.key === currentDifficulty)?.name || 'Safe Mode'} • System Load
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Difficulty mode (System Load)',
                    'Safe: no shuffle, no timer (normal XP).\nStandard: shuffle only (+10% XP).\nTurbo: shuffle + 30s timer (+50% XP).\nOverdrive: shuffle + 15s timer (x2 XP).\nBeast: shuffle + 5s timer (x3 XP).\n\nA 3-second grace window applies after the timer hits zero.'
                  );
                }}
                style={{ paddingHorizontal: 8, paddingVertical: 6 }}
              >
                <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.themesBlock}>
            <View style={styles.themesHeaderRow}>
              <Icon name="color-palette-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.themesTitle}>Themes</Text>
            </View>
            <Text style={styles.themesHint}>
              Unlock themes at {themeUnlocks.pulse.toLocaleString()} XP, {themeUnlocks.aurora.toLocaleString()} XP, and {themeUnlocks.singularity.toLocaleString()} XP.
            </Text>
            <View style={styles.themesList}>
              {themeOptions.map((opt) => {
                const isSelected = theme === opt.key;
                const label = opt.unlocked ? opt.name : `${opt.name} (locked)`;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.themeOptionButton,
                      isSelected && styles.themeOptionButtonSelected,
                      !opt.unlocked && styles.themeOptionButtonLocked,
                    ]}
                    onPress={() => handleSelectTheme(opt.key)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.themeOptionTitle, isSelected && styles.themeOptionTitleSelected]}>
                        {label}
                      </Text>
                      {!opt.unlocked && (
                        <Text style={styles.themeOptionSubtitle}>
                          Unlock at {opt.requiredXp.toLocaleString()} XP
                        </Text>
                      )}
                    </View>
                    {isSelected && <Icon name="checkmark-circle" size={22} color={colors.primary} />}
                    {!isSelected && opt.unlocked && <Icon name="chevron-forward" size={22} color={colors.textSecondary} />}
                    {!opt.unlocked && <Icon name="lock-closed-outline" size={20} color={colors.textSecondary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="notifications-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Push Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.primary }}
              thumbColor={notificationsEnabled ? '#fff' : '#CBD5E1'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Icon name="alert-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Cards Due Reminders</Text>
            <Switch
              value={inAppNotificationsEnabled}
              onValueChange={handleInAppNotificationToggle}
              trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.primary }}
              thumbColor={inAppNotificationsEnabled ? '#fff' : '#CBD5E1'}
            />
          </View>
          <Text style={styles.settingHintBelow}>
            Show notification banner when you have cards due for review
          </Text>
          
          <TouchableOpacity 
            style={styles.settingRow}
            onPress={() => {
              const mode = tier === 'pro' ? 'priority' : 'support';
              // Capture before opening modal, so we capture the Profile screen context (or current screen).
              (async () => {
                let uri: string | undefined;
                try {
                  uri = await captureFeedbackScreenshot();
                } catch {
                  // non-fatal
                }
                navigate('FeedbackModal', {
                  mode,
                  contextTitle: tier === 'pro' ? 'Priority help & support' : 'Help & support',
                  contextHint: 'Tell us what’s wrong — add steps to reproduce and a screenshot if possible.',
                  sourceRouteName: 'Profile',
                  sourceRouteParams: null,
                  defaultCategory: 'bug',
                  initialScreenshotUri: uri,
                });
              })();
            }}
          >
            <Icon name="help-circle-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>{tier === 'pro' ? 'Priority Help & Support' : 'Help & Support'}</Text>
            <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Walkthrough' as never)}
          >
            <Icon name="rocket-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Interactive walkthrough</Text>
            <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.fl4shcards.com/privacy/')}
          >
            <Icon name="document-text-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Privacy Policy</Text>
            <Icon name="open-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openURL('https://www.fl4shcards.com/terms/')}
          >
            <Icon name="document-text-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Terms of Use (EULA)</Text>
            <Icon name="open-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('DeleteAccount' as never)}
          >
            <Icon name="trash-outline" size={24} color="#DC2626" />
            <Text style={[styles.settingText, { color: '#DC2626', fontWeight: '600' }]}>Delete Account</Text>
            <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity 
              style={[styles.settingRow, styles.adminRow]}
              onPress={() => navigation.navigate('AdminDashboard' as never)}
            >
              <Icon name="shield-checkmark" size={24} color="#00F5FF" />
              <Text style={[styles.settingText, styles.adminText]}>Admin Panel</Text>
              <Icon name="chevron-forward" size={24} color="#00F5FF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Statistics' as never)}
          >
            <Icon name="trending-up" size={22} color={colors.textSecondary} />
            <Text style={styles.settingText}>Statistics Dashboard</Text>
            <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeaderToggle}
            onPress={() => setExpandedSections((prev) => ({ ...prev, faqs: !prev.faqs }))}
          >
            <View style={styles.sectionHeaderLeft}>
              <Text style={styles.sectionTitle}>FAQs</Text>
              <Text style={styles.sectionSummary}>Help centre • common questions</Text>
            </View>
            <Ionicons
              name={expandedSections.faqs ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {expandedSections.faqs && (
            <TouchableOpacity style={styles.settingRow} onPress={() => setFaqVisible(true)}>
              <Icon name="help-circle-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.settingText}>Frequently asked questions</Text>
              <Icon name="chevron-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Difficulty Mode Modal */}
        <Modal visible={difficultyVisible} transparent animationType="fade" onRequestClose={() => setDifficultyVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Difficulty mode</Text>
              <Text style={styles.modalLabel}>Concept 1: System Load</Text>
              <View style={{ marginTop: 10, gap: 10 }}>
                {DIFFICULTY_PRESETS.map((p) => {
                  const isSelected = currentDifficulty === p.key;
                  const locked = tierRank(tier) < tierRank(p.minTier);
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.themeOptionButton,
                        isSelected && styles.themeOptionButtonSelected,
                        locked && styles.themeOptionButtonLocked,
                      ]}
                      onPress={() => applyDifficulty(p.key)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.themeOptionTitle, isSelected && styles.themeOptionTitleSelected]}>
                          {p.name} {locked ? '(locked)' : ''}
                        </Text>
                        <Text style={styles.themeOptionSubtitle}>
                          {p.tagline} • Shuffle {p.shuffle ? 'On' : 'Off'} • Timer {p.timerSeconds ? `${p.timerSeconds}s` : 'Off'} • XP x{p.xpMultiplier}
                        </Text>
                      </View>
                      {isSelected ? <Icon name="checkmark-circle" size={22} color={colors.primary} /> : null}
                      {locked ? <Icon name="lock-closed-outline" size={20} color={colors.textSecondary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setDifficultyVisible(false)}>
                  <Text style={styles.modalButtonSecondaryText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        
        {/* Edit Profile Modal */}
        <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Edit profile</Text>
              <Text style={styles.modalLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                value={draftUsername}
                onChangeText={setDraftUsername}
                placeholder="Enter a username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalButtonSecondary} onPress={() => setEditVisible(false)} disabled={savingProfile}>
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalButtonPrimary} onPress={saveProfile} disabled={savingProfile}>
                  <Text style={styles.modalButtonPrimaryText}>{savingProfile ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Parent Invite Modal (Free plan) */}
        <Modal
          visible={parentInviteVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setParentInviteVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Invite a parent/guardian</Text>
              <Text style={styles.modalLabel}>Parent / guardian email</Text>
              <TextInput
                style={styles.modalInput}
                value={parentInviteEmail}
                onChangeText={setParentInviteEmail}
                placeholder="parent@example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!sendingParentInvite}
              />
              <Text style={[styles.themeOptionSubtitle, { marginTop: 8 }]}>
                We’ll email them a link to the parent page. If they purchase, you’ll receive a code to redeem in the app.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalButtonSecondary}
                  onPress={() => setParentInviteVisible(false)}
                  disabled={sendingParentInvite}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalButtonPrimary}
                  onPress={handleSendParentInvite}
                  disabled={sendingParentInvite}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {sendingParentInvite ? 'Sending…' : 'Send invite'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={faqVisible} transparent animationType="fade" onRequestClose={() => setFaqVisible(false)}>
          <View style={styles.modalOverlay}>
            <Pressable style={styles.faqBackdrop} onPress={() => setFaqVisible(false)} />
            <View style={styles.faqModalCard}>
              <View style={styles.faqModalHeader}>
                <Text style={styles.modalTitle}>FAQs</Text>
                <TouchableOpacity onPress={() => setFaqVisible(false)} style={styles.faqClose}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.faqContent}>
                {FAQS.map((cat) => (
                  <View key={cat.title} style={styles.faqCategory}>
                    <Text style={styles.faqCategoryTitle}>{cat.title}</Text>
                    {cat.items.map((item) => {
                      const open = expandedFaqIds.has(item.id);
                      return (
                        <View key={item.id} style={[styles.faqItem, open && styles.faqItemOpen]}>
                          <TouchableOpacity
                            style={styles.faqQuestionRow}
                            onPress={() =>
                              setExpandedFaqIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) next.delete(item.id);
                                else next.add(item.id);
                                return next;
                              })
                            }
                          >
                            <Text style={styles.faqQuestionText}>{item.question}</Text>
                            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          {open && (
                            <View style={styles.faqAnswer}>
                              {item.answer.map((line, idx) => (
                                <Text
                                  key={`${item.id}-p-${idx}`}
                                  style={styles.faqAnswerText}
                                  onPress={() => {
                                    if (line.includes('support@fl4shcards.com')) {
                                      Linking.openURL('mailto:support@fl4shcards.com');
                                    }
                                  }}
                                >
                                  {line}
                                </Text>
                              ))}
                              {item.bullets?.map((bullet, idx) => (
                                <View key={`${item.id}-b-${idx}`} style={styles.faqBulletRow}>
                                  <Text style={styles.faqBulletDot}>•</Text>
                                  <Text style={styles.faqBulletText}>{bullet}</Text>
                                </View>
                              ))}
                              {item.note ? <Text style={styles.faqNote}>{item.note}</Text> : null}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  faqFloatingButton: {
    position: 'absolute',
    right: 16,
    top: 56,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(0,245,255,0.55)',
    zIndex: 8,
  },
  faqFloatingButtonText: {
    color: '#00F5FF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: -1,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    // Dark "stage" so neon status icon pops
    backgroundColor: '#0B1220',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    // Mobile-first: make the status icon feel "powered on"
    shadowColor: '#14b8a6',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  avatarImage: {
    width: 92,
    height: 92,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  editProfileButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  editProfileButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSummary: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  smallLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  smallLinkButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 15,
  },
  settingHintBelow: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 12,
    paddingLeft: 38,
  },
  themesBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 6,
  },
  themesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themesTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  themesHint: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    paddingLeft: 34,
  },
  themesList: {
    marginTop: 10,
    gap: 10,
  },
  themeOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  themeOptionButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.45)',
  },
  themeOptionButtonLocked: {
    opacity: 0.6,
  },
  themeOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  themeOptionTitleSelected: {
    color: colors.primary,
  },
  themeOptionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  adminRow: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  adminText: {
    color: '#00F5FF',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 18,
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  faqModalCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
  },
  faqBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  faqModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  faqClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  faqOverlayClose: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 3,
  },
  faqContent: {
    paddingBottom: 24,
  },
  faqCategory: {
    marginBottom: 16,
  },
  faqCategoryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  faqItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqItemOpen: {
    borderColor: 'rgba(0,245,255,0.35)',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  faqAnswer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  faqBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  faqBulletDot: {
    color: colors.primary,
    fontSize: 14,
    marginTop: 1,
  },
  faqBulletText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  faqNote: {
    marginTop: 6,
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: colors.text,
    fontWeight: '900',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#000',
    fontWeight: '900',
  },
  // Subscription styles
  subscriptionStatus: {
    alignItems: 'center',
  },
  subscriptionInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subscriptionTier: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  subscriptionLimits: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#00D4FF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
    width: '100%',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 8,
  },
  restoreButtonText: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '500',
  },
  manageStoreButton: {
    paddingVertical: 8,
  },
  manageStoreButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
});