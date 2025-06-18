import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';

// Ensure web browser sessions complete properly
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URI for OAuth
const redirectUri = makeRedirectUri({
  scheme: 'flash',
  path: 'auth/callback'
});

export type SocialProvider = 'google' | 'tiktok' | 'snapchat' | 'apple';

interface AuthResponse {
  error: any;
  url?: string;
}

export const socialAuth = {
  // Sign in with Google
  signInWithGoogle: async (): Promise<AuthResponse> => {
    try {
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
        // Open the auth URL in a web browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'cancel') {
          return { error: new Error('Authentication cancelled') };
        }

        return { error: null, url: data.url };
      }

      return { error: new Error('No authentication URL returned') };
    } catch (error) {
      console.error('Google sign in error:', error);
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
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'cancel') {
          return { error: new Error('Authentication cancelled') };
        }

        return { error: null, url: data.url };
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
      case 'tiktok':
        return socialAuth.signInWithTikTok();
      case 'snapchat':
        return socialAuth.signInWithSnapchat();
      case 'apple':
        return socialAuth.signInWithApple();
      default:
        return { error: new Error(`Provider ${provider} not supported`) };
    }
  },
}; 