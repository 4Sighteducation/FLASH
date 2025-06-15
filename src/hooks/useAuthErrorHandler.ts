import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export const useAuthErrorHandler = () => {
  const { signOut } = useAuth();

  useEffect(() => {
    // Global error handler for Supabase auth errors
    const handleAuthError = async (error: any) => {
      if (!error) return;
      
      const errorMessage = error?.message || error?.error_description || '';
      
      // Check for refresh token errors
      if (
        errorMessage.includes('Invalid Refresh Token') ||
        errorMessage.includes('Already Used') ||
        errorMessage.includes('refresh_token_not_found') ||
        errorMessage.includes('invalid_grant')
      ) {
        console.log('🔄 Refresh token error detected, clearing session...');
        
        try {
          // Clear all possible auth storage keys
          const keysToRemove = [
            'supabase.auth.token',
            'flash-app-auth',
            'sb-auth-token',
            'supabase.auth.refreshToken',
            'supabase.auth.currentSession',
          ];
          
          await Promise.all(
            keysToRemove.map(key => AsyncStorage.removeItem(key).catch(() => {}))
          );
          
          // Force sign out
          await signOut();
          
          console.log('✅ Session cleared successfully');
        } catch (clearError) {
          console.error('❌ Error clearing session:', clearError);
        }
      }
    };

    // Listen for auth errors
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          // Clear storage on sign out
          try {
            await AsyncStorage.multiRemove([
              'supabase.auth.token',
              'flash-app-auth',
              'sb-auth-token',
            ]);
          } catch (error) {
            console.error('Error clearing storage on sign out:', error);
          }
        }
      }
    );

    // Override the global fetch to catch auth errors
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check for auth errors in response
        if (!response.ok && response.status === 401) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            await handleAuthError(data);
          } catch {
            // Not JSON, ignore
          }
        }
        
        return response;
      } catch (error) {
        await handleAuthError(error);
        throw error;
      }
    };

    return () => {
      subscription.unsubscribe();
      // Restore original fetch
      global.fetch = originalFetch;
    };
  }, [signOut]);
};

export default useAuthErrorHandler; 