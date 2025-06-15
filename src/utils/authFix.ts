import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

export const clearAuthTokens = async () => {
  try {
    console.log('🧹 Clearing auth tokens...');
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    
    // Filter auth-related keys
    const authKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('token') ||
      key.includes('session')
    );
    
    console.log('🔑 Found auth keys to clear:', authKeys);
    
    // Remove all auth keys
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log('✅ Auth tokens cleared');
    }
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    console.log('✅ Signed out from Supabase');
    
  } catch (error) {
    console.error('❌ Error clearing auth tokens:', error);
  }
};

export const fixRefreshTokenError = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error && (
      error.message?.includes('Invalid Refresh Token') ||
      error.message?.includes('Already Used') ||
      error.message?.includes('refresh_token_not_found')
    )) {
      console.log('🔧 Fixing refresh token error...');
      await clearAuthTokens();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error fixing refresh token:', error);
    return false;
  }
}; 