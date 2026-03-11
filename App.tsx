import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { SubscriptionProvider, useSubscription } from './src/contexts/SubscriptionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigate } from './src/navigation/RootNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/services/supabase';
import * as Linking from 'expo-linking';
import 'react-native-url-polyfill/auto';
import { handleOAuthCallback } from './src/utils/oauthHandler';
import * as Notifications from 'expo-notifications';
import { markPromptShown, recordAppLaunch, shouldShowReviewPrompt } from './src/utils/reviewPrompt';

const PENDING_REDEEM_CODE_KEY = 'pendingRedeemCode_v1';

function normalizeRedeemCode(code: string): string {
  return String(code || '')
    .replace(/[^0-9A-Z]/gi, '')
    .toUpperCase()
    .trim();
}

function AppContent() {
  const { refreshSubscription } = useSubscription();
  const redeemInFlightRef = useRef(false);

  useEffect(() => {
    const redeemPendingCodeIfPossible = async (source: string) => {
      if (redeemInFlightRef.current) return;
      redeemInFlightRef.current = true;
      try {
        const stored = await AsyncStorage.getItem(PENDING_REDEEM_CODE_KEY);
        const code = normalizeRedeemCode(stored || '');
        if (!code) return;

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return; // Keep stored until user signs in.

        const { data, error } = await supabase.functions.invoke('redeem-code', {
          body: { code },
          headers: { Authorization: `Bearer ${token}` },
        } as any);

        if (error || !data?.ok) {
          // Stop retry loops; show a helpful fallback UI instead.
          await AsyncStorage.removeItem(PENDING_REDEEM_CODE_KEY);
          const msg = (error as any)?.message || data?.error || 'Could not activate Pro from this link.';
          Alert.alert('Could not activate Pro', msg);
          try {
            navigate('RedeemCodeModal' as never, { code } as never);
          } catch {
            // ignore
          }
          return;
        }

        await AsyncStorage.removeItem(PENDING_REDEEM_CODE_KEY);
        try {
          await refreshSubscription();
        } catch {
          // ignore
        }

        // Lightweight confirmation (keeps UX “magic” without requiring manual redeem).
        try {
          navigate(
            'CelebrationModal' as never,
            { title: 'Pro activated ⚡', badge: 'PRO', message: 'Everything is unlocked — you’re all set.', ctaLabel: 'Continue' } as never
          );
        } catch {
          // ignore
        }
      } finally {
        redeemInFlightRef.current = false;
      }
    };

    const queueRedeemCodeFromLink = async (rawCode: string, source: string) => {
      const code = normalizeRedeemCode(rawCode);
      if (!code) return;
      await AsyncStorage.setItem(PENDING_REDEEM_CODE_KEY, code);
      await redeemPendingCodeIfPossible(source);
    };

    // Track launches and show an occasional review prompt after meaningful usage.
    // Defaults are conservative to avoid annoying students.
    recordAppLaunch()
      .then(async (state) => {
        // Only consider prompting if they're signed in.
        const { data } = await supabase.auth.getSession();
        const hasUser = !!data?.session?.user?.id;
        if (!hasUser) return;

        if (!shouldShowReviewPrompt(state)) return;

        // Mark as shown up-front so we never loop if navigation fails.
        await markPromptShown();

        // Give the app a moment to settle (avoid colliding with onboarding/paywall modals).
        setTimeout(() => {
          try {
            navigate('ReviewPromptModal' as never);
          } catch {
            // ignore
          }
        }, 4500);
      })
      .catch(() => {
        // ignore
      });

    // Handle deep links for OAuth
    const handleDeepLink = async (url: string) => {
      // Redeem deep link: com.foursighteducation.flash://redeem?code=XXXX
      // Must be handled regardless of OAuth callback URLs.
      const parsed = Linking.parse(url);
      if (parsed?.path === 'redeem') {
        const code = (parsed?.queryParams as any)?.code;
        if (typeof code === 'string' && code.length > 0) {
          // Make it seamless: queue + auto-redeem after login (Apple/Google/email), with modal fallback.
          await queueRedeemCodeFromLink(code, 'deeplink');
          // If they are not signed in, nudge them into login (AppNavigator will show Login anyway).
          try {
            const { data } = await supabase.auth.getSession();
            if (!data?.session?.user?.id) {
              navigate('Login' as never);
            }
          } catch {
            // ignore
          }
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
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
          // If the user just signed in after tapping a claim link, auto-activate in the background.
          void redeemPendingCodeIfPossible(`auth:${event}`);
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