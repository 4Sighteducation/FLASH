import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URI for OAuth - using bundle identifier for iOS
const redirectUri = makeRedirectUri({
  scheme: Platform.OS === 'ios' ? 'com.foursighteducation.flash' : 'flash',
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
          // The deep link handler in App.tsx will process the tokens
          // Just return success here
          console.log('OAuth flow completed, waiting for deep link handler...');
          return { error: null };
        }

        return { error: null };
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
          console.log('OAuth flow completed, waiting for deep link handler...');
          return { error: null };
        }

        return { error: null };
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
      console.log('Starting Apple OAuth with redirect URI:', redirectUri);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUri,
        },
      });

      if (error) {
        console.error('Apple auth error:', error);
        return { error };
      }

      if (data?.url) {
        console.log('Opening Apple OAuth URL...');
        
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
          console.log('OAuth flow completed, waiting for deep link handler...');
          return { error: null };
        }

        return { error: null };
      }

      return { error: new Error('No authentication URL returned') };
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