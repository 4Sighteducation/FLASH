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
                  <Ionicons name="flame" size={32} color="#FF006E" />
                  <Text style={styles.statNumber}>{dailyStats.streak}</Text>
                  <Text style={styles.statLabel}>Day Streak 🔥</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.streak > 0 ? "Keep it going!" : "Start today!"}
                  </Text>
                </View>

                <View style={[styles.statCard, styles.statCardPink]}>
                  <Ionicons name="checkbox-outline" size={32} color="#00F5FF" />
                  <Text style={styles.statNumber}>{dailyStats.cardsToReview}</Text>
                  <Text style={styles.statLabel}>Cards Due ✓</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.cardsToReview > 0 ? "Time to study!" : "All caught up!"}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statCard, styles.statCardGradient]}>
                  <Ionicons name="add-circle-outline" size={32} color="#00F5FF" />
                  <Text style={styles.statNumber}>{dailyStats.newCards}</Text>
                  <Text style={styles.statLabel}>New Today 📚</Text>
                  <Text style={styles.statHint}>
                    {dailyStats.newCards > 0 ? "Nice work!" : "Create some cards!"}
                  </Text>
                </View>

                <View style={[styles.statCard, styles.statCardGradient]}>
                  <Ionicons name="trophy" size={32} color="#FFD700" />
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
                    <Ionicons name="flash" size={24} color="#0a0f1e" />
                    <Text style={styles.actionButtonTextPrimary}>
                      Start Studying ({dailyStats.cardsToReview})
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => navigation.navigate('Main' as never)}
                >
                  <Ionicons name="home-outline" size={24} color="#00F5FF" />
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
      description: "We're about to turn your exam prep from 'mild panic' to 'quietly confident' using AI, voice tech, and some genuinely clever algorithms. No nonsense, just results.",
      buttonText: "Right, Let's Go →",
    },
    {
      icon: '🧠',
      title: "How This Works",
      subtitle: "Surprisingly simple, actually",
      description: "FLASH uses the Leitner Box system - a proven spaced repetition technique. Cards you know? See you later. Cards that trip you up? Back tomorrow. Think of it as a study buddy who actually remembers what you need to work on.",
      features: [
        { icon: '🤖', text: 'AI creates cards from any topic' },
        { icon: '🎤', text: 'Voice answers with instant feedback' },
        { icon: '📸', text: 'Photo to flashcard in seconds' },
        { icon: '📊', text: 'Track your progress properly' },
      ],
      buttonText: "Brilliant →",
    },
    {
      icon: '🎯',
      title: "Let's Get You Set Up",
      subtitle: "What are you studying?",
      description: "Choose your exam type and subjects. Don't worry, you can change this anytime. We're quite flexible.",
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

            {/* Logo */}
            <Animated.View 
              style={[
                styles.logoContainer,
                {
                  transform: [{
                    scale: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1.02],
                    }),
                  }],
                }
              ]}
            >
              <Image
                source={require('../../../assets/flash-logo-transparent.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Step content */}
            <View style={styles.wizardContent}>
              <Text style={styles.stepIcon}>{currentWizardStep.icon}</Text>
              <Text style={styles.stepTitle}>{currentWizardStep.title}</Text>
              <Text style={styles.stepSubtitle}>{currentWizardStep.subtitle}</Text>
              <Text style={styles.stepDescription}>{currentWizardStep.description}</Text>

              {/* Features list for step 2 */}
              {currentWizardStep.features && (
                <View style={styles.featuresContainer}>
                  {currentWizardStep.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Text style={styles.featureIcon}>{feature.icon}</Text>
                      <Text style={styles.featureText}>{feature.text}</Text>
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
      minHeight: '100vh',
      backgroundImage: `
        linear-gradient(rgba(255, 0, 110, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 110, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 160,
    height: 160,
  },
  
  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
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
    marginBottom: 40,
  },
  stepIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#00F5FF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
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
    paddingVertical: 18,
    paddingHorizontal: 32,
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
    fontSize: 18,
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
