import { supabase } from './supabase';

export type UserSettings = {
  user_id: string;
  shuffle_mcq_enabled: boolean;
  answer_timer_seconds: number; // 0=off
  grace_seconds: number; // default 3
  time_bank_seconds: number; // optional v2
  updated_at?: string;
};

const DEFAULTS: Omit<UserSettings, 'user_id'> = {
  shuffle_mcq_enabled: false,
  answer_timer_seconds: 0,
  grace_seconds: 3,
  time_bank_seconds: 0,
};

export async function getOrCreateUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    console.warn('[userSettings] fetch failed', error);
    return null;
  }
  if (data) return data as UserSettings;

  const { data: created, error: createError } = await supabase
    .from('user_settings')
    .insert({ user_id: userId, ...DEFAULTS })
    .select('*')
    .maybeSingle();

  if (createError) {
    console.warn('[userSettings] create failed', createError);
    return null;
  }
  return (created as UserSettings) || null;
}

export async function updateUserSettings(userId: string, patch: Partial<UserSettings>): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .update(patch)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[userSettings] update failed', error);
    return null;
  }
  return (data as UserSettings) || null;
}

export async function refreshDailyStudyStatsMV(): Promise<boolean> {
  const { error } = await supabase.rpc('refresh_user_daily_study_stats_mv');
  if (error) {
    console.warn('[stats] refresh mv failed', error);
    return false;
  }
  return true;
}

export type DailyStudyStat = {
  user_id: string;
  study_date: string;
  reviews_total: number;
  correct_total: number;
  incorrect_total: number;
  accuracy: number;
  avg_answer_ms: number | null;
  timed_reviews_total: number;
  xp_awarded_total: number;
  avg_xp_multiplier: number | null;
};

export async function fetchDailyStudyStats(userId: string, limit = 60): Promise<DailyStudyStat[]> {
  const { data, error } = await supabase
    .from('user_daily_study_stats_mv')
    .select('*')
    .eq('user_id', userId)
    .order('study_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[stats] fetch failed', error);
    return [];
  }
  return (data as DailyStudyStat[]) || [];
}


