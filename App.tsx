import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigate } from './src/navigation/RootNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/services/supabase';
import * as Linking from 'expo-linking';
import 'react-native-url-polyfill/auto';
import { handleOAuthCallback } from './src/utils/oauthHandler';

function AppContent() {
  useEffect(() => {
    // Handle deep links for OAuth
    const handleDeepLink = async (url: string) => {
      // Redeem deep link: com.foursighteducation.flash://redeem?code=XXXX
      // Must be handled regardless of OAuth callback URLs.
      const parsed = Linking.parse(url);
      if (parsed?.path === 'redeem') {
        const code = (parsed?.queryParams as any)?.code;
        if (typeof code === 'string' && code.length > 0) {
          // Navigate into the Profile stack modal
          navigate('Main', {
            screen: 'Profile',
            params: { screen: 'RedeemCode', params: { code } },
          });
        }
        return;
      }

      if (url && url.includes('auth/callback')) {
        console.log('OAuth callback received, processing...');
        // Let the oauthHandler process the URL.
        // It will call setSession, which triggers onAuthStateChange in AuthContext.
        const result = await handleOAuthCallback(url);
        if (!result.success) {
          const message =
            typeof result.error === 'string'
              ? result.error
              : result.error?.message || 'Authentication failed. Please try again.';
          console.error('OAuth callback processing failed:', result.error);
          Alert.alert('Login Error', message);
        }
      }
    };

    // Listen for deep links
    const urlSubscription = Linking.addEventListener('url', (event) => {
      void handleDeepLink(event.url);
    });

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url);
      }
    });

    // Keep storage tidy on true sign-out. Do NOT clear on TOKEN_REFRESHED (that can invalidate sessions).
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
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

    return () => {
      authSubscription.unsubscribe();
      urlSubscription.remove();
    };
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
      <ThemeProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 