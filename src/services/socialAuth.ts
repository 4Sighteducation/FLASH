import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';
import { handleOAuthCallback } from '../utils/oauthHandler';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URI for OAuth.
// - Web must use an https URL (current origin) so the browser can redirect back.
// - Native uses a custom scheme deep link handled in App.tsx.
const redirectUri =
  Platform.OS === 'web'
    ? makeRedirectUri({ path: 'auth/callback' })
    : makeRedirectUri({
        // Use ONE canonical scheme across iOS + Android so Supabase redirect allow-list is stable.
        // (Using different schemes per platform often results in "redirect not allowed" or web auth sessions that never resolve.)
        scheme: 'com.foursighteducation.flash',
        path: 'auth/callback',
        preferLocalhost: false,
        isTripleSlashed: true,
      });

console.log('OAuth Redirect URI:', redirectUri);

export type SocialProvider = 'google' | 'microsoft' | 'apple' | 'tiktok' | 'snapchat';
export type AuthProvider = SocialProvider | 'phone';

interface AuthResponse {
  error: any;
  url?: string;
}

export const phoneAuth = {
  // Send OTP to phone number
  sendOTP: async (phone: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms',
        }
      });

      if (error) {
        console.error('Phone OTP error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Send OTP error:', error);
      return { error };
    }
  },

  // Verify OTP code
  verifyOTP: async (phone: string, token: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: token,
        type: 'sms',
      });

      if (error) {
        console.error('Verify OTP error:', error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return { error };
    }
  },
};

export const socialAuth = {
  // Sign in with Google
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
      if (Platform.OS === 'ios') {
        return { error: new Error('Google Sign-In is not enabled on iOS') };
      }
      console.log('Starting Google OAuth with redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google auth error:', error);
        return { error };
      }

      if (data?.url) {
        console.log('Opening Google OAuth URL...');
        
        // Open the auth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
          {
            dismissButtonStyle: 'close',
          }
        );

        console.log('WebBrowser result:', result);

        if (result.type === 'cancel') {
          return { error: new Error('Authentication cancelled') };
        }

        if (result.type === 'success') {
          // Prefer processing the returned redirect URL directly (more reliable than relying on the url event)
          if (!result.url) {
            return { error: new Error('No redirect URL received. Please try again.') };
          }

          const handled = await handleOAuthCallback(result.url);
          if (!handled.success) {
            return { error: new Error(handled.error?.message || handled.error || 'Authentication failed') };
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            return { error: new Error('Login completed but no session was created. Please try again.') };
          }
          return { error: null };
        }

        return { error: new Error('Authentication did not complete. Please try again.') };
      }

      return { error: new Error('No authentication URL returned') };
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    }
  },

  // Sign in with Microsoft (Azure AD)
  signInWithMicrosoft: async (): Promise<AuthResponse> => {
    try {
      if (Platform.OS !== 'web') {
        return { error: new Error('Microsoft Sign-In is only enabled on web') };
      }
      console.log('Starting Microsoft OAuth with redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUri,
          scopes: 'email profile openid',
        },
      });

      if (error) {
        console.error('Microsoft auth error:', error);
        return { error };
      }

      if (data?.url) {
        console.log('Opening Microsoft OAuth URL...');
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
          {
            dismissButtonStyle: 'close',
          }
        );

        console.log('WebBrowser result:', result);

        if (result.type === 'cancel') {
          return { error: new Error('Authentication cancelled') };
        }

        if (result.type === 'success') {
          if (!result.url) {
            return { error: new Error('No redirect URL received. Please try again.') };
          }

          const handled = await handleOAuthCallback(result.url);
          if (!handled.success) {
            return { error: new Error(handled.error?.message || handled.error || 'Authentication failed') };
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            return { error: new Error('Login completed but no session was created. Please try again.') };
          }
          return { error: null };
        }

        return { error: new Error('Authentication did not complete. Please try again.') };
      }

      return { error: new Error('No authentication URL returned') };
    } catch (error) {
      console.error('Microsoft sign in error:', error);
      return { error };
    }
  },

  // Sign in with TikTok (requires TikTok OAuth app setup)
  signInWithTikTok: async (): Promise<AuthResponse> => {
    try {
      // Note: TikTok OAuth requires approval and setup
      Alert.alert(
        'Coming Soon',
        'TikTok login will be available in the next update!'
      );
      return { error: new Error('TikTok auth not yet implemented') };
      
      // When implemented:
      // const { data, error } = await supabase.auth.signInWithOAuth({
      //   provider: 'tiktok',
      //   options: {
      //     redirectTo: redirectUri,
      //   },
      // });
    } catch (error) {
      console.error('TikTok sign in error:', error);
      return { error };
    }
  },

  // Sign in with Snapchat (requires Snapchat OAuth app setup)
  signInWithSnapchat: async (): Promise<AuthResponse> => {
    try {
      // Note: Snapchat OAuth requires approval and setup
      Alert.alert(
        'Coming Soon',
        'Snapchat login will be available in the next update!'
      );
      return { error: new Error('Snapchat auth not yet implemented') };
      
      // When implemented:
      // const { data, error } = await supabase.auth.signInWithOAuth({
      //   provider: 'snapchat',
      //   options: {
      //     redirectTo: redirectUri,
      //   },
      // });
    } catch (error) {
      console.error('Snapchat sign in error:', error);
      return { error };
    }
  },

  // Sign in with Apple (iOS only)
  signInWithApple: async (): Promise<AuthResponse> => {
    if (Platform.OS !== 'ios') {
      return { error: new Error('Apple Sign In is only available on iOS') };
    }

    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        return { error: new Error('Sign in with Apple is not available on this device') };
      }

      // Use a nonce to protect against replay attacks.
      // Apple expects the *hashed* nonce in the request, but Supabase expects the *raw* nonce for verification.
      const nonceBytes = await Crypto.getRandomBytesAsync(16);
      const rawNonce = Array.from(nonceBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return { error: new Error('No identity token returned from Apple') };
      }

      // Exchange the Apple identity token for a Supabase session (native flow, no web prompt)
      const { data, error } = await (supabase.auth as any).signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        console.error('Apple native sign-in error:', error);
        return { error };
      }

      if (!data?.session) {
        return { error: new Error('Login completed but no session was created. Please try again.') };
      }

      return { error: null };
    } catch (error) {
      console.error('Apple sign in error:', error);
      return { error };
    }
  },

  // Generic OAuth sign in method
  signInWithProvider: async (provider: SocialProvider): Promise<AuthResponse> => {
    switch (provider) {
      case 'google':
        return socialAuth.signInWithGoogle();
      case 'microsoft':
        return socialAuth.signInWithMicrosoft();
      case 'apple':
        return socialAuth.signInWithApple();
      case 'tiktok':
        return socialAuth.signInWithTikTok();
      case 'snapchat':
        return socialAuth.signInWithSnapchat();
      default:
        return { error: new Error(`Provider ${provider} not supported`) };
    }
  },
}; 