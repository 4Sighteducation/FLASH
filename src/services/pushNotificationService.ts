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
      // If the RPC isn't installed yet, fall back to the upsert below.
      console.warn('[Push] claim_user_push_token failed:', claimError);
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


