import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get environment variables from app.config.js extra field
const extra = Constants.expoConfig?.extra || {};

// Supabase configuration
const supabaseUrl = extra.EXPO_PUBLIC_SUPABASE_URL || 'https://qkapwhyxcpgzahuemucg.supabase.co';
const supabaseAnonKey = extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔑 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key exists:', !!supabaseAnonKey);
console.log('🔑 Supabase Key length:', supabaseAnonKey.length);

if (!supabaseAnonKey) {
  console.error('❌ Supabase Anon Key is not set!');
}

// Create Supabase client with AsyncStorage for React Native
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return error?.message || 'An unexpected error occurred';
}; 