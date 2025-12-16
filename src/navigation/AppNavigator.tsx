import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import { supabase } from '../services/supabase';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import MainNavigator from './MainNavigator';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import ExamTypeSelectionScreen from '../screens/onboarding/ExamTypeSelectionScreen';
import SubjectSelectionScreen from '../screens/onboarding/SubjectSelectionScreen';
import SubjectSearchScreen from '../screens/onboarding/SubjectSearchScreen';
import OnboardingCompleteScreen from '../screens/onboarding/OnboardingCompleteScreen';
import SplashScreen from '../screens/SplashScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AppNavigator useEffect - user:', user?.id, 'authLoading:', authLoading);
    if (user) {
      checkOnboardingStatus();
    } else {
      console.log('No user, setting loading to false');
      setLoading(false);
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('Checking onboarding status for user:', user?.id);
      
      if (!user?.id) {
        console.log('No user ID found, setting onboarded to false');
        setIsOnboarded(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('is_onboarded')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Supabase error checking onboarding:', error);
        // If user record doesn't exist, assume not onboarded
        if (error.code === 'PGRST116') {
          console.log('User record not found, assuming not onboarded');
          setIsOnboarded(false);
        } else {
          throw error;
        }
      } else {
        console.log('Onboarding status:', data?.is_onboarded);
        setIsOnboarded(data?.is_onboarded || false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Default to not onboarded if there's an error
      setIsOnboarded(false);
    } finally {
      setLoading(false);
    }
  };

  console.log('AppNavigator render - authLoading:', authLoading, 'loading:', loading, 'user:', user?.id, 'isOnboarded:', isOnboarded);
  
  if (authLoading || loading) {
    return <SplashScreen />;
  }

  return (
    <SubscriptionProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            isOnboarded ? (
              <Stack.Screen name="Main" component={MainNavigator} />
            ) : (
              <>
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="ExamTypeSelection" component={ExamTypeSelectionScreen} />
                <Stack.Screen name="SubjectSearch" component={SubjectSearchScreen} />
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
    </SubscriptionProvider>
  );
} 