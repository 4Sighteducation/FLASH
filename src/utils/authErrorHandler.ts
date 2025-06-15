import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const handleAuthError = async (error: any) => {
  console.log('Auth error:', error);
  
  // Check if it's a refresh token error
  if (error?.message?.includes('Invalid Refresh Token') || 
      error?.message?.includes('Already Used') ||
      error?.message?.includes('refresh_token_not_found')) {
    
    console.log('Refresh token error detected, clearing session...');
    
    try {
      // Clear the stored session
      await AsyncStorage.removeItem('supabase.auth.token');
      await AsyncStorage.removeItem('flash-app-auth');
      
      // Sign out the user
      await supabase.auth.signOut();
      
      console.log('Session cleared successfully');
      return true;
    } catch (clearError) {
      console.error('Error clearing session:', clearError);
      return false;
    }
  }
  
  return false;
};

// Middleware to wrap Supabase calls and handle auth errors
export const withAuthErrorHandling = async <T>(
  supabaseCall: () => Promise<T>
): Promise<T | null> => {
  try {
    return await supabaseCall();
  } catch (error: any) {
    const handled = await handleAuthError(error);
    if (handled) {
      // Auth error was handled, return null to indicate retry is needed
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}; 