import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/services/supabase';
import 'react-native-url-polyfill/auto';

function AppContent() {
  useEffect(() => {
    // Handle auth errors globally
    const handleAuthError = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
            // Clear any stale tokens
            try {
              const keys = await AsyncStorage.getAllKeys();
              const authKeys = keys.filter(key => 
                key.includes('supabase') || 
                key.includes('auth') || 
                key.includes('token')
              );
              if (authKeys.length > 0) {
                await AsyncStorage.multiRemove(authKeys);
              }
            } catch (error) {
              console.error('Error clearing auth storage:', error);
            }
          }
        }
      );

      return () => subscription.unsubscribe();
    };

    handleAuthError();

    // Clear any invalid tokens on app start
    const clearInvalidTokens = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error && (
          error.message?.includes('Invalid Refresh Token') ||
          error.message?.includes('Already Used')
        )) {
          console.log('Clearing invalid refresh token...');
          const keys = await AsyncStorage.getAllKeys();
          const authKeys = keys.filter(key => 
            key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('token')
          );
          await AsyncStorage.multiRemove(authKeys);
          await supabase.auth.signOut();
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    clearInvalidTokens();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
} 