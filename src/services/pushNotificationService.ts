import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type PushRegistrationResult =
  | { ok: true; expoPushToken: string }
  | { ok: false; reason: string };

// Show notifications when received (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    // SDK 54+/iOS 17+ uses these fields
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    // Show a badge count on the app icon when we send a badge number
    shouldSetBadge: true,
  }),
});

function getEasProjectId(): string | undefined {
  // For EAS builds, this is the correct project id for getExpoPushTokenAsync.
  return (
    (Constants as any).easConfig?.projectId ||
    (Constants as any).expoConfig?.extra?.eas?.projectId ||
    (Constants as any).expoConfig?.extra?.EXPO_PUBLIC_PUSH_NOTIFICATION_PROJECT_ID
  );
}

export const pushNotificationService = {
  /**
   * Set the app icon badge count.
   * iOS supports this natively; Android support varies by launcher.
   */
  async setAppBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      const n = Math.max(0, Math.floor(Number(count) || 0));
      await Notifications.setBadgeCountAsync(n);
      if (n === 0) {
        // Best-effort: clear notification center items too
        try {
          await (Notifications as any).dismissAllNotificationsAsync?.();
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore (never block UX)
    }
  },

  /**
   * Recompute due cards "right now" and sync the app badge immediately.
   * Useful after a study session ends, so the badge clears without waiting for the hourly cron push.
   */
  async syncAppBadgeToDueCards(
    userId: string
  ): Promise<{ ok: true; dueCount: number } | { ok: false; error: string }> {
    try {
      if (!userId) return { ok: false, error: 'Missing userId' };

      // Match server-side due logic: only consider cards in the user's active subjects.
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`subject:exam_board_subjects!subject_id(subject_name)`)
        .eq('user_id', userId);
      if (subjectsError) return { ok: false, error: subjectsError.message };

      const activeSubjects = (userSubjects || [])
        .map((s: any) => s?.subject?.subject_name)
        .filter(Boolean) as string[];

      if (activeSubjects.length === 0) {
        await this.setAppBadgeCount(0);
        return { ok: true, dueCount: 0 };
      }

      const { count, error } = await supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('in_study_bank', true)
        .lte('next_review_date', new Date().toISOString())
        .in('subject_name', activeSubjects);
      if (error) return { ok: false, error: error.message };

      const dueCount = count || 0;
      await this.setAppBadgeCount(dueCount);
      return { ok: true, dueCount };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Failed to sync badge' };
    }
  },

  async registerForPushNotifications(): Promise<PushRegistrationResult> {
    try {
      // Request permission
      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }

      if (status !== 'granted') {
        return { ok: false, reason: 'Notifications permission not granted' };
      }

      const projectId = getEasProjectId();
      if (!projectId) {
        return { ok: false, reason: 'Missing EAS projectId for push token registration' };
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      // Android requires a channel for proper display
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      return { ok: true, expoPushToken: token.data };
    } catch (e: any) {
      return { ok: false, reason: e?.message || 'Failed to register for push notifications' };
    }
  },

  async upsertPushToken(params: {
    userId: string;
    expoPushToken: string;
    enabled: boolean;
  }): Promise<void> {
    const { userId, expoPushToken, enabled } = params;

    // Claim the token first (handles account switching / reinstall scenarios)
    const { error: claimError } = await supabase.rpc('claim_user_push_token', {
      p_expo_push_token: expoPushToken,
      p_platform: Platform.OS,
    });
    if (claimError) {
      // If the RPC isn't installed yet, don't attempt the upsert (it often triggers RLS errors
      // when the same token exists for another user). We'll retry once the migration is applied.
      console.warn('[Push] claim_user_push_token failed:', claimError);
      if ((claimError as any).code === 'PGRST202') {
        return;
      }
    }

    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          enabled,
          platform: Platform.OS,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'expo_push_token' }
      );

    if (error) throw error;
  },

  async upsertPreferences(params: {
    userId: string;
    pushEnabled: boolean;
    dailyDueCardsEnabled?: boolean;
    dailyDueCardsHour?: number;
    timezone?: string;
  }): Promise<void> {
    const { userId, pushEnabled, dailyDueCardsEnabled, dailyDueCardsHour, timezone } = params;

    const tz =
      timezone ||
      (typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : undefined) ||
      'UTC';

    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: userId,
          push_enabled: pushEnabled,
          daily_due_cards_enabled: dailyDueCardsEnabled ?? true,
          daily_due_cards_hour: dailyDueCardsHour ?? 18,
          timezone: tz,
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  },
};


