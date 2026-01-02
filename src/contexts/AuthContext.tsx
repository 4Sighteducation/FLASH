import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { cleanupOrphanedCards } from '../utils/databaseMaintenance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationService } from '../services/pushNotificationService';
// NOTE: Keep AuthProvider fast. Any network-heavy “maintenance” should be fire-and-forget.
import { migrateUserTopicPrioritiesToV2 } from '../utils/priorityMigration';

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

  const maybeSendWelcomeEmail = async (u: User) => {
    try {
      if (!u?.id) return;
      const key = `welcomeEmailSent:${u.id}`;
      const already = await AsyncStorage.getItem(key);
      if (already === 'true') return;

      // Best-effort: edge function is idempotent server-side; we also cache locally to avoid repeated calls.
      await supabase.functions.invoke('welcome-email', { body: {} });
      await AsyncStorage.setItem(key, 'true');
    } catch (e) {
      console.warn('[Auth] Welcome email skipped (non-fatal):', e);
    }
  };

  // Function to handle session updates
  const handleSession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    
    // Clean up orphaned cards when user is authenticated
    if (newSession?.user?.id) {
      // IMPORTANT: never block app startup on background maintenance work.
      const uid = newSession.user.id;

      // One-time data migration: unify priority scale to v2 (1=highest, 4=lowest).
      // Run async so it cannot freeze the app on slow networks / large accounts.
      setTimeout(() => {
        void migrateUserTopicPrioritiesToV2(uid).catch((e) => {
          console.warn('[Auth] Priority migration skipped (non-fatal):', e);
        });
      }, 0);

      // Cleanup is best-effort and should never block UI.
      setTimeout(() => {
        void cleanupOrphanedCards(uid)
          .then((result) => {
            if (result.success && result.orphanedCount && result.orphanedCount > 0) {
              console.log(`Cleaned up ${result.orphanedCount} orphaned cards from subjects: ${result.orphanedSubjects?.join(', ')}`);
            }
          })
          .catch((error) => {
            console.error('Error cleaning up orphaned cards:', error);
          });
      }, 0);

      // Best-effort: register push token if user has enabled notifications
      setTimeout(() => {
        void (async () => {
          try {
            const enabled = (await AsyncStorage.getItem('notificationsEnabled')) !== 'false';
            if (enabled) {
              await pushNotificationService.upsertPreferences({
                userId: uid,
                pushEnabled: true,
              });
              const reg = await pushNotificationService.registerForPushNotifications();
              if (reg.ok) {
                await pushNotificationService.upsertPushToken({
                  userId: uid,
                  expoPushToken: reg.expoPushToken,
                  enabled: true,
                });
              }
            }
          } catch (e) {
            console.warn('[Auth] Push registration skipped:', e);
          }
        })();
      }, 0);

      // Best-effort: send welcome email after the first successful sign-in (works for verified users).
      // Do not block the UI on email delivery.
      setTimeout(() => {
        void maybeSendWelcomeEmail(newSession.user);
      }, 0);
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

  // NOTE:
  // We previously attempted to refresh the session on AppState "active". In practice this can
  // cause request storms / deadlocks on some devices/accounts. Supabase already auto-refreshes tokens.

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
    const currentUserId = user?.id;
    try {
      // Best-effort: sign out from Supabase first.
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Ensure local state clears even if the auth event doesn't fire for some reason.
      setSession(null);
      setUser(null);

      // Uninstall/reinstall "fixes" usually mean persisted storage got into a bad state.
      // Clear known auth/app keys best-effort to avoid stuck sessions / dead UI after tier changes.
      try {
        const keys = await AsyncStorage.getAllKeys();
        const toRemove = keys.filter((k) => {
          if (k.startsWith('sb-')) return true; // supabase-js auth tokens
          if (k.includes('supabase')) return true;
          if (k.startsWith('welcomeEmailSent:')) return true;
          if (k.startsWith('subscriptionTier:')) return true;
          if (k.startsWith('userSettings:')) return true;
          return false;
        });
        if (toRemove.length) {
          await AsyncStorage.multiRemove(toRemove);
        }
        // Also clear per-user tier key explicitly if present.
        if (currentUserId) {
          await AsyncStorage.removeItem(`subscriptionTier:${currentUserId}`);
        }
      } catch (e) {
        console.warn('[Auth] Failed to clear local storage on signOut (non-fatal):', e);
      }
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