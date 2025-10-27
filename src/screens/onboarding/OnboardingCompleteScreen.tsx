import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingCompleteScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

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
    <LinearGradient
      colors={['#6366F1', '#8B5CF6']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.successIcon}>
              <Icon name="checkmark-circle" size={100} color="#10B981" />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>All Set!</Text>
            <Text style={styles.subtitle}>
              Your personalized study plan is ready
            </Text>
            <Text style={styles.description}>
              You've successfully customized your subjects and topics. 
              Start creating flashcards and begin your learning journey!
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <View style={styles.feature}>
              <Icon name="flash" size={24} color="#F59E0B" />
              <Text style={styles.featureText}>Create flashcards from your topics</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="trending-up" size={24} color="#10B981" />
              <Text style={styles.featureText}>Track your progress with analytics</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="trophy" size={24} color="#8B5CF6" />
              <Text style={styles.featureText}>Earn achievements as you learn</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>Start Learning</Text>
            <Icon name="arrow-forward" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconContainer: {
    marginTop: 40,
  },
  successIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
    padding: 20,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    color: '#E0E7FF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#C7D2FE',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
  },
}); 