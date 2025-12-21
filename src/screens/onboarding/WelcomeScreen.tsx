import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');
const STEP_COUNT = 3;

interface DailyStats {
  cardsToReview: number;
  streak: number;
  newCards: number;
}

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const windowHeight = Dimensions.get('window').height;
  const isCompact = windowHeight < 780;
  const isVeryCompact = windowHeight < 720;
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[WelcomeScreen] Mounting, user:', user?.id);
    checkUserStatus();
    startAnimations();
  }, [user]);

  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Continuous glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const checkUserStatus = async () => {
    try {
      if (!user) {
        // No user means they're at login - shouldn't see this screen
        setLoading(false);
        return;
      }

      // Check if user has completed onboarding
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_onboarded, created_at')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles

      // If no profile exists OR is_onboarded is false, treat as new user
      const isNew = !profile || !profile.is_onboarded;
      console.log('[WelcomeScreen] User profile:', profile, 'isNew:', isNew, 'error:', profileError);
      setIsReturningUser(!isNew);

      if (!isNew && profile) {
        // Fetch daily stats for returning users
        await fetchDailyStats();
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      // On error, assume new user and show wizard
      setIsReturningUser(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyStats = async () => {
    try {
      if (!user) return;

      // Get cards due today
      const { data: cards } = await supabase
        .from('flashcards')
        .select('id, next_review')
        .eq('user_id', user.id)
        .lte('next_review', new Date().toISOString());

      // Get user's study streak
      const { data: profile } = await supabase
        .from('users')
        .select('current_streak')
        .eq('id', user.id)
        .single();

      // Get new cards created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: newCards } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      setDailyStats({
        cardsToReview: cards?.length || 0,
        streak: profile?.current_streak || 0,
        newCards: newCards?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < STEP_COUNT - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation.navigate('ExamTypeSelection' as never);
    }
  };

  const skipToSetup = () => {
    navigation.navigate('ExamTypeSelection' as never);
  };

  if (loading) {
    console.log('[WelcomeScreen] Rendering loading state');
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Image
            source={require('../../../assets/flash-logo-transparent.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  console.log('[WelcomeScreen] Rendering, isReturningUser:', isReturningUser);

  // RETURNING USER VIEW
  if (isReturningUser && dailyStats) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              {/* Logo with glow */}
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    opacity: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  }
                ]}
              >
                <Image
                  source={require('../../../assets/flash-logo-transparent.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* Welcome back message */}
              <View style={styles.welcomeBackContainer}>
                <Text style={styles.welcomeBackTitle}>Welcome Back! ⚡</Text>
                <Text style={styles.welcomeBackSubtitle}>
                  Ready to crush some flashcards?
                </Text>
              </View>

              {/* Daily stats cards */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardCyan]}>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 32 }}>🔥</Text>
                  ) : (
                    <Ionicons name="flame" size={32} color="#FF006E" />
                  )}
                  <Text style={styles.statNumber}>{dailyStats.streak}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.streak > 0 ? "Keep it going!" : "Start today!"}
                  </Text>
                </View>

                <View style={[styles.statCard, styles.statCardPink]}>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 32 }}>☑️</Text>
                  ) : (
                    <Ionicons name="checkbox-outline" size={32} color="#00F5FF" />
                  )}
                  <Text style={styles.statNumber}>{dailyStats.cardsToReview}</Text>
                  <Text style={styles.statLabel}>Cards Due ✓</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.cardsToReview > 0 ? "Time to study!" : "All caught up!"}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardGradient]}>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 32 }}>➕</Text>
                  ) : (
                    <Ionicons name="add-circle-outline" size={32} color="#00F5FF" />
                  )}
                  <Text style={styles.statNumber}>{dailyStats.newCards}</Text>
                  <Text style={styles.statLabel}>New Today 📚</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.newCards > 0 ? "Nice work!" : "Create some cards!"}
                  </Text>
                </View>

                <View style={[styles.statCard, styles.statCardGradient]}>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 32 }}>🏆</Text>
                  ) : (
                    <Ionicons name="trophy" size={32} color="#FFD700" />
                  )}
                  <Text style={styles.statNumber}>
                    {dailyStats.cardsToReview > 0 ? '📖' : '🎉'}
                  </Text>
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.cardsToReview > 0 ? "Study time!" : "Legend!"}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionButtonsContainer}>
                {dailyStats.cardsToReview > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={() => navigation.navigate('Main' as never)}
                  >
                    {Platform.OS === 'web' ? (
                      <Text style={{ fontSize: 24 }}>⚡</Text>
                    ) : (
                      <Ionicons name="flash" size={24} color="#0a0f1e" />
                    )}
                    <Text style={styles.actionButtonTextPrimary}>
                      Start Studying ({dailyStats.cardsToReview})
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => navigation.navigate('Main' as never)}
                >
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 24 }}>🏠</Text>
                  ) : (
                    <Ionicons name="home-outline" size={24} color="#00F5FF" />
                  )}
                  <Text style={styles.actionButtonTextSecondary}>Go to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // NEW USER WIZARD
  const wizardSteps = [
    {
      icon: '⚡',
      title: "Welcome to FLASH!",
      subtitle: "Where last-minute revision actually works",
      description: "Turn exam prep from panic to confidence with smart flashcards and spaced repetition.",
      buttonText: "Right, Let's Go →",
    },
    {
      icon: '🧠',
      title: "How This Works",
      subtitle: "Surprisingly simple, actually",
      description: "Cards you know reappear later. Cards you miss come back sooner. Your weak spots get more practice automatically.",
      features: [
        { icon: '🤖', text: 'AI creates cards from any topic' },
        { icon: '🎤', text: 'Voice answers + feedback' },
        { icon: '📸', text: 'Photo → flashcards' },
        { icon: '📊', text: 'Progress tracking' },
      ],
      buttonText: "Brilliant →",
    },
    {
      icon: '🎯',
      title: "Let's Get You Set Up",
      subtitle: "What are you studying?",
      description: "Pick your exam type + subjects. You can change this anytime.",
      buttonText: "Set My Subjects →",
    },
  ];

  const currentWizardStep = wizardSteps[currentStep];

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Small logo in top-right (keeps content above-the-fold) */}
            <Animated.View
              style={[
                styles.logoFloating,
                {
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1.02],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image
                source={require('../../../assets/flash-logo-transparent.png')}
                style={styles.logoSmall}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {Array.from({ length: STEP_COUNT }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotComplete,
                  ]}
                />
              ))}
            </View>

            {/* Step content */}
            <View style={styles.wizardContent}>
              <Text style={[styles.stepIcon, isCompact && { fontSize: 56, marginBottom: 10 }]}>
                {currentWizardStep.icon}
              </Text>
              <Text style={[styles.stepTitle, isCompact && { fontSize: 26 }]}>
                {currentWizardStep.title}
              </Text>
              <Text style={[styles.stepSubtitle, isCompact && { fontSize: 16, marginBottom: 12 }]}>
                {currentWizardStep.subtitle}
              </Text>
              <Text
                style={[
                  styles.stepDescription,
                  isCompact && { fontSize: 14, lineHeight: 20, marginBottom: 14 },
                ]}
              >
                {currentWizardStep.description}
              </Text>

              {/* Features list for step 2 */}
              {currentWizardStep.features && (
                <View style={styles.featuresContainer}>
                  {currentWizardStep.features.map((feature, index) => (
                    <View
                      key={index}
                      style={[
                        styles.featureItem,
                        isCompact && { width: '48%', padding: 12, marginBottom: 10 },
                        isVeryCompact && { padding: 10 },
                      ]}
                    >
                      <Text style={[styles.featureIcon, isCompact && { fontSize: 24, marginRight: 10 }]}>
                        {feature.icon}
                      </Text>
                      <Text style={[styles.featureText, isCompact && { fontSize: 13 }]}>
                        {feature.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Navigation buttons */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>{currentWizardStep.buttonText}</Text>
              </TouchableOpacity>

              {currentStep < STEP_COUNT - 1 && (
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={skipToSetup}
                >
                  <Text style={styles.skipButtonText}>Skip intro</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
      backgroundImage: `
        linear-gradient(rgba(255, 0, 110, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 110, 0.03) 1px, transparent 1px)
      ` as any,
      backgroundSize: '50px 50px' as any,
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 200,
    height: 200,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
    marginTop: 20,
  },
  logoFloating: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 56,
    height: 56,
    opacity: 0.9,
    zIndex: 10,
  },
  logoSmall: {
    width: 56,
    height: 56,
  },
  
  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: '#00F5FF',
    borderColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  progressDotComplete: {
    backgroundColor: '#FF006E',
    borderColor: '#FF006E',
  },

  // Wizard content
  wizardContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    fontSize: 56,
    marginBottom: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#00F5FF',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
    width: '48%',
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '500',
  },

  // Navigation
  navigationContainer: {
    marginTop: 'auto',
  },
  nextButton: {
    backgroundColor: '#00F5FF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.8)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // Returning user view
  welcomeBackContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeBackTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  welcomeBackSubtitle: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 6,
  },
  statCardCyan: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  statCardPink: {
    backgroundColor: 'rgba(255, 0, 110, 0.05)',
    borderColor: 'rgba(255, 0, 110, 0.2)',
  },
  statCardGradient: {
    backgroundColor: 'rgba(138, 92, 246, 0.05)',
    borderColor: 'rgba(138, 92, 246, 0.2)',
  },
  statNumber: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  statHint: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actionButtonsContainer: {
    marginTop: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#00F5FF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.8)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
    }),
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#00F5FF',
  },
  actionButtonTextPrimary: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00F5FF',
    letterSpacing: 0.5,
  },
});
