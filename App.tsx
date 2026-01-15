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
import * as Notifications from 'expo-notifications';

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

      // Password recovery deep link:
      // com.foursighteducation.flash:///reset-password#access_token=...&refresh_token=...&type=recovery
      // Note: Some deep links may come through as scheme://reset-password (host) instead of scheme:///reset-password (path).
      const hostOrHostname = (parsed as any)?.hostname ?? (parsed as any)?.host;
      if (parsed?.path === 'reset-password' || hostOrHostname === 'reset-password') {
        try {
          const hash = url.includes('#') ? url.split('#')[1] : '';
          const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
          const raw = hash || query;
          const params = new URLSearchParams(raw);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const code = params.get('code');

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) {
              console.error('Failed to set session from recovery link:', error);
              Alert.alert('Reset Error', error.message || 'Invalid or expired reset link.');
              return;
            }
            navigate('ResetPassword' as never);
            return;
          }

          // Support PKCE-style recovery links (rare, but safe).
          if (code) {
            const { data, error } = await (supabase.auth as any).exchangeCodeForSession(code);
            if (error) {
              console.error('Failed to exchange code for session:', error);
              Alert.alert('Reset Error', error.message || 'Invalid or expired reset link.');
              return;
            }
            if (data?.session) {
              navigate('ResetPassword' as never);
              return;
            }
          }

          Alert.alert('Reset Error', 'Invalid or expired reset link.');
          return;
        } catch (e: any) {
          console.error('Error handling reset-password deep link:', e);
          Alert.alert('Reset Error', e?.message || 'Invalid or expired reset link.');
          return;
        }
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

    // Handle push notification taps (e.g. trial expiry warning -> open in-app nudge modal -> paywall)
    const notificationResponseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data: any = response?.notification?.request?.content?.data || {};
        if (data?.type === 'trial_expiry') {
          navigate(
            'TrialExpiryNudgeModal' as never,
            { source: 'trial_expiry_push', daysRemaining: data.daysRemaining, expiresAt: data.expiresAt } as never
          );
        }
      } catch {
        // ignore
      }
    });

    // If a warning arrives while the app is open, show the same in-app nudge.
    const notificationReceivedSub = Notifications.addNotificationReceivedListener((notif) => {
      try {
        const data: any = notif?.request?.content?.data || {};
        if (data?.type === 'trial_expiry') {
          navigate(
            'TrialExpiryNudgeModal' as never,
            { source: 'trial_expiry_push_foreground', daysRemaining: data.daysRemaining, expiresAt: data.expiresAt } as never
          );
        }
      } catch {
        // ignore
      }
    });

    // If app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        const data: any = resp?.notification?.request?.content?.data || {};
        if (data?.type === 'trial_expiry') {
          navigate(
            'TrialExpiryNudgeModal' as never,
            { source: 'trial_expiry_push_initial', daysRemaining: data.daysRemaining, expiresAt: data.expiresAt } as never
          );
        }
      })
      .catch(() => {
        // ignore
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
      notificationResponseSub.remove();
      notificationReceivedSub.remove();
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