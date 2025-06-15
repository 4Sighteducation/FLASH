import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import MainNavigator from './MainNavigator';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ExamTypeSelectionScreen from '../screens/onboarding/ExamTypeSelectionScreen';
import SubjectSelectionScreen from '../screens/onboarding/SubjectSelectionScreen';
import TopicCurationScreen from '../screens/onboarding/TopicCurationScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_onboarded')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      
      setIsOnboarded(data?.is_onboarded || false);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(false);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          isOnboarded ? (
            <Stack.Screen name="Main" component={MainNavigator} />
          ) : (
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="ExamTypeSelection" component={ExamTypeSelectionScreen} />
              <Stack.Screen name="SubjectSelection" component={SubjectSelectionScreen} />
              <Stack.Screen name="TopicCuration" component={TopicCurationScreen} />
              <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
              <Stack.Screen name="Main" component={MainNavigator} />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 