import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { cleanupOrphanedCards } from '../utils/databaseMaintenance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationService } from '../services/pushNotificationService';
import { navigate } from '../navigation/RootNavigation';
// NOTE: Keep AuthProvider fast. Any network-heavy “maintenance” should be fire-and-forget.
import { migrateUserTopicPrioritiesToV2 } from '../utils/priorityMigration';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  // Post-SSO onboarding prompts
  const [profileGateVisible, setProfileGateVisible] = useState(false);
  const [profileDraftName, setProfileDraftName] = useState('');
  const [profileDraftSchool, setProfileDraftSchool] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [emailIssueVisible, setEmailIssueVisible] = useState(false);
  const [emailIssueMessage, setEmailIssueMessage] = useState<string | null>(null);
  const [contactEmailDraft, setContactEmailDraft] = useState('');
  const [emailIssueSaving, setEmailIssueSaving] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());

  const ensureAndFetchUserRow = async (
    u: User
  ): Promise<{ username?: string | null; school_name?: string | null; contact_email?: string | null } | null> => {
    if (!u?.id) return null;
    const email = String(u.email || '').trim().toLowerCase();

    const first = await supabase.from('users').select('username, school_name, contact_email').eq('id', u.id).maybeSingle();
    if (!first.error && first.data) return first.data as any;

    // If missing, best-effort create via RPC (used in onboarding, but SSO users may not have reached it yet).
    try {
      await supabase.rpc('ensure_user_profile', {
        p_user_id: u.id,
        p_email: email,
        p_username: (u.user_metadata as any)?.username ?? null,
      });
    } catch {
      // non-fatal
    }

    const retry = await supabase.from('users').select('username, school_name, contact_email').eq('id', u.id).maybeSingle();
    if (retry.error) return null;
    return (retry.data as any) || null;
  };

  const shouldGateProfile = (u: User, usernameRaw: string | null | undefined): boolean => {
    const email = String(u.email || '').trim().toLowerCase();
    const username = String(usernameRaw || '').trim();
    if (!username) return true;

    // If user signed in with Apple "Hide My Email", the local-part is random and often becomes their default username.
    // Gate once to encourage a human display name, but keep the auth flow smooth.
    if (email.endsWith('@privaterelay.appleid.com')) {
      const local = email.split('@')[0] || '';
      if (local && username === local) return true;
    }

    return false;
  };

  const dismissEmailIssueForCurrentEvent = async () => {
    try {
      if (!user?.id) return;
      const { data: ev } = await supabase
        .from('user_email_events')
        .select('delivery_event_at')
        .eq('user_id', user.id)
        .eq('type', 'welcome')
        .maybeSingle();
      const eventAt = String((ev as any)?.delivery_event_at || '');
      const dismissKey = `emailIssueDismissedFor:${user.id}:${eventAt || 'unknown'}`;
      await AsyncStorage.setItem(dismissKey, 'true');
    } catch {
      // non-fatal
    }
  };

  const checkPostLoginPrompts = async (u: User) => {
    try {
      if (!u?.id) return;

      // 1) Profile completion (name + optional school)
      const userRow = await ensureAndFetchUserRow(u);
      const username = userRow?.username ?? (u.user_metadata as any)?.username ?? '';

      if (shouldGateProfile(u, username)) {
        setProfileDraftName(String(username || '').trim());
        setProfileDraftSchool(String(userRow?.school_name || '').trim());
        setProfileGateVisible(true);
        // Don't show the email issue modal until profile is complete (less overwhelming).
        return;
      }

      // 2) Email delivery issue prompt (only if the welcome email bounced/dropped/blocked/spamreport)
      const { data: ev, error: evErr } = await supabase
        .from('user_email_events')
        .select('delivery_status, delivery_error, delivery_event_at')
        .eq('user_id', u.id)
        .eq('type', 'welcome')
        .maybeSingle();

      if (evErr || !ev) return;

      const status = String((ev as any).delivery_status || 'unknown');
      const eventAt = String((ev as any).delivery_event_at || '');
      const isBad = ['bounce', 'dropped', 'blocked', 'spamreport'].includes(status);
      if (!isBad) return;

      // Don't spam: dismiss per-event timestamp.
      const dismissKey = `emailIssueDismissedFor:${u.id}:${eventAt || 'unknown'}`;
      const dismissed = await AsyncStorage.getItem(dismissKey);
      if (dismissed === 'true') return;

      const existingContact = String(userRow?.contact_email || '').trim();
      setContactEmailDraft(existingContact);
      setEmailIssueMessage(
        [
          'We couldn’t deliver your welcome email.',
          '',
          status === 'bounce'
            ? 'This usually happens when the inbox rejects mail (common with Apple Hide My Email if relay is disabled).'
            : 'This usually happens when the inbox provider blocks or drops the message.',
          '',
          'Add a contact email you can receive mail at (optional) so we can reach you if needed.',
          (ev as any).delivery_error ? `\nDetails: ${(ev as any).delivery_error}` : '',
        ].join('\n')
      );
      setEmailIssueVisible(true);
    } catch (e) {
      console.warn('[Auth] post-login prompts skipped (non-fatal):', e);
    }
  };

  const saveProfileGate = async () => {
    if (!user?.id) return;
    const nextName = profileDraftName.trim();
    if (!nextName) return;
    setProfileSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ username: nextName, school_name: profileDraftSchool.trim() || null })
        .eq('id', user.id);
      if (error) throw error;

      // Best-effort keep auth metadata aligned
      try {
        await supabase.auth.updateUser({ data: { username: nextName } });
      } catch {
        // non-fatal
      }

      setProfileGateVisible(false);
      setTimeout(() => {
        void checkPostLoginPrompts(user);
      }, 0);
    } catch (e: any) {
      console.warn('[Auth] saveProfileGate failed:', e);
    } finally {
      setProfileSaving(false);
    }
  };

  const dismissEmailIssue = async () => {
    await dismissEmailIssueForCurrentEvent();
    setEmailIssueVisible(false);
  };

  const saveContactEmail = async () => {
    if (!user?.id) return;
    const email = contactEmailDraft.trim().toLowerCase();
    if (email && !isValidEmail(email)) return;

    setEmailIssueSaving(true);
    try {
      const { error } = await supabase.from('users').update({ contact_email: email || null }).eq('id', user.id);
      if (error) throw error;
      await dismissEmailIssueForCurrentEvent();
      setEmailIssueVisible(false);
    } catch (e) {
      console.warn('[Auth] saveContactEmail failed', e);
    } finally {
      setEmailIssueSaving(false);
    }
  };

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

  const bestEffortTelemetryPing = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const locale = (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().locale;
        } catch {
          return null;
        }
      })();
      const timezone = (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
          return null;
        }
      })();

      await supabase.functions.invoke('telemetry-ping', {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          platform: Platform.OS,
          app_version: (Constants.expoConfig as any)?.version ?? Constants.nativeAppVersion ?? null,
          build_version: Constants.nativeBuildVersion ?? null,
          device_model: (Device as any)?.modelName ?? null,
          os_name: (Device as any)?.osName ?? Platform.OS,
          os_version: (Device as any)?.osVersion ?? null,
          locale,
          timezone,
        },
      } as any);
    } catch (e) {
      console.warn('[Auth] telemetry ping skipped (non-fatal):', e);
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

      // Best-effort: start the 30-day Pro access window (server-side) for new users.
      // This must never block UI; failures just mean they stay Free until next successful call.
      setTimeout(() => {
        void (async () => {
          try {
            await supabase.rpc('ensure_pro_trial_started');
          } catch (e) {
            console.warn('[Auth] ensure_pro_trial_started skipped (non-fatal):', e);
          }
        })();
      }, 0);

      // If the trial has expired, show an in-app warning on next open/login (push may be disabled).
      // We do NOT auto-wipe here; the modal lets the user upgrade or confirm a reset.
      setTimeout(() => {
        void (async () => {
          try {
            const { data } = await supabase
              .from('user_subscriptions')
              .select('source, expires_at, expired_processed_at')
              .eq('user_id', uid)
              .maybeSingle();

            const isTrial = String((data as any)?.source || '') === 'trial';
            const expRaw = (data as any)?.expires_at as string | null | undefined;
            const processed = !!(data as any)?.expired_processed_at;
            const expired = expRaw ? new Date(expRaw).getTime() <= Date.now() : false;

            if (isTrial && expired && !processed) {
              navigate('TrialExpiredModal');
            }
          } catch (e) {
            console.warn('[Auth] Trial expiry check skipped (non-fatal):', e);
          }
        })();
      }, 0);

      // Best-effort: send welcome email after the first successful sign-in (works for verified users).
      // Do not block the UI on email delivery.
      setTimeout(() => {
        void maybeSendWelcomeEmail(newSession.user);
      }, 0);

      // Best-effort: capture device + country telemetry for admin analytics.
      setTimeout(() => {
        void bestEffortTelemetryPing();
      }, 0);

      // Best-effort: profile completion + email reachability prompts
      setTimeout(() => {
        void checkPostLoginPrompts(newSession.user);
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

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Profile completion gate (e.g., Apple relay usernames) */}
      <Modal visible={profileGateVisible} transparent animationType="fade">
        <View style={gateStyles.overlay}>
          <View style={gateStyles.card}>
            <Text style={gateStyles.title}>Complete your profile</Text>
            <Text style={gateStyles.body}>
              Set a display name (this is what you’ll see in your profile and progress screens).
            </Text>

            <Text style={gateStyles.label}>Display name</Text>
            <TextInput
              style={gateStyles.input}
              value={profileDraftName}
              onChangeText={setProfileDraftName}
              placeholder="e.g. Tony"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="words"
              editable={!profileSaving}
            />

            <Text style={gateStyles.label}>School (optional)</Text>
            <TextInput
              style={gateStyles.input}
              value={profileDraftSchool}
              onChangeText={setProfileDraftSchool}
              placeholder="e.g. St Mary’s College"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="words"
              editable={!profileSaving}
            />

            <TouchableOpacity
              style={[gateStyles.primaryBtn, (!profileDraftName.trim() || profileSaving) && { opacity: 0.6 }]}
              onPress={saveProfileGate}
              disabled={!profileDraftName.trim() || profileSaving}
            >
              <Text style={gateStyles.primaryBtnText}>{profileSaving ? 'Saving…' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email reachability prompt */}
      <Modal visible={emailIssueVisible} transparent animationType="fade" onRequestClose={dismissEmailIssue}>
        <View style={gateStyles.overlay}>
          <View style={gateStyles.card}>
            <Text style={gateStyles.title}>Email delivery issue</Text>
            <Text style={gateStyles.body}>{emailIssueMessage || 'We couldn’t deliver an email to your address.'}</Text>

            <Text style={gateStyles.label}>Contact email (optional)</Text>
            <TextInput
              style={gateStyles.input}
              value={contactEmailDraft}
              onChangeText={setContactEmailDraft}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.45)"
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!emailIssueSaving}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[gateStyles.secondaryBtn, { flex: 1 }]}
                onPress={dismissEmailIssue}
                disabled={emailIssueSaving}
              >
                <Text style={gateStyles.secondaryBtnText}>Not now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  gateStyles.primaryBtn,
                  { flex: 1, marginTop: 14 },
                  (!!contactEmailDraft.trim() && !isValidEmail(contactEmailDraft)) && { opacity: 0.6 },
                ]}
                onPress={saveContactEmail}
                disabled={emailIssueSaving || (!!contactEmailDraft.trim() && !isValidEmail(contactEmailDraft))}
              >
                <Text style={gateStyles.primaryBtnText}>{emailIssueSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
}; 

const gateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#0B1020',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  title: {
    color: '#E6EAF2',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: 'rgba(230,234,242,0.82)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  label: {
    color: 'rgba(230,234,242,0.78)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E6EAF2',
    backgroundColor: '#070A12',
  },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#00E5FF',
  },
  primaryBtnText: {
    color: '#0B1020',
    fontWeight: '900',
  },
  secondaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  secondaryBtnText: {
    color: '#E6EAF2',
    fontWeight: '800',
  },
});
