import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { cleanupOrphanedCards } from '../utils/databaseMaintenance';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to handle session updates
  const handleSession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    // Clean up orphaned cards when user is authenticated
    if (newSession?.user?.id) {
      try {
        const result = await cleanupOrphanedCards(newSession.user.id);
        if (result.success && result.orphanedCount && result.orphanedCount > 0) {
          console.log(`Cleaned up ${result.orphanedCount} orphaned cards from subjects: ${result.orphanedSubjects?.join(', ')}`);
        }
      } catch (error) {
        console.error('Error cleaning up orphaned cards:', error);
      }
    }
  };

  // Function to refresh session
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        // If refresh fails, sign out the user
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Already Used')) {
          await signOut();
        }
      } else {
        await handleSession(session);
      }
    } catch (error) {
      console.error('Error in refreshSession:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initialize session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error('Error getting session:', error);
            setLoading(false);
            return;
          }
          
          await handleSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, 'Session:', newSession?.user?.email);
        
        if (!mounted) return;

        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in, updating session...');
            await handleSession(newSession);
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed, updating session...');
            await handleSession(newSession);
            break;
          case 'SIGNED_OUT':
            console.log('User signed out');
            setSession(null);
            setUser(null);
            break;
          case 'USER_UPDATED':
            console.log('User updated');
            if (newSession) {
              await handleSession(newSession);
            }
            break;
          default:
            console.log('Other auth event:', event);
            break;
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      // The user profile will be created automatically by the database trigger
      // No need to manually insert into the users table

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 