import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingCompleteScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Mark user as onboarded
    markUserAsOnboarded();
  }, []);

  const markUserAsOnboarded = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_onboarded: true })
        .eq('id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  };

  const handleGetStarted = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' as never }],
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.successIcon}>
              {Platform.OS === 'web' ? (
                <Text style={{ fontSize: 84 }}>✅</Text>
              ) : (
                <Ionicons name="checkmark-circle" size={84} color="#00F5FF" />
              )}
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.subtitle}>Create your first flashcards</Text>
            <Text style={styles.description}>
              Search a topic → AI generates cards → you study with spaced repetition.
            </Text>
          </View>

          <View style={styles.howItWorksContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Search a topic</Text>
                <Text style={styles.stepDescription}>e.g. “photosynthesis”</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>AI generates cards</Text>
                <Text style={styles.stepDescription}>exam-focused + instant</Text>
              </View>
            </View>

            <View style={styles.stepNoMargin}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Study & master</Text>
                <Text style={styles.stepDescription}>Leitner boxes handle timing</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Create Your First Flashcards →</Text>
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
      minHeight: '100vh' as any,
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      ` as any,
      backgroundSize: '50px 50px' as any,
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  iconContainer: {
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 100,
    padding: 20,
    borderWidth: 3,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 40px rgba(0, 245, 255, 0.4)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 30,
      elevation: 10,
    }),
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    color: '#00F5FF',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  howItWorksContainer: {
    width: '100%',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    marginTop: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNoMargin: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF006E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#00F5FF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 30px rgba(0, 245, 255, 0.8)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 25,
      elevation: 10,
    }),
  },
  buttonText: {
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
