import { supabase } from '../services/supabase';
import type { SubscriptionLimits, SubscriptionTier } from '../contexts/SubscriptionContext';
import { showUpgradePrompt } from './upgradePrompt';

export async function getUserSubjectCount(userId: string): Promise<number> {
  // NOTE: Use a normal select (not head count) because some RLS setups can return count=0 unexpectedly.
  // Free tier only needs at most 1, so this is cheap in practice.
  const { data, error } = await supabase
    .from('user_subjects')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).length;
}

export async function getUserCardCount(userId: string): Promise<number> {
  // Same reasoning as above; Free tier is capped at 10 so this stays cheap.
  const { data, error } = await supabase
    .from('flashcards')
    .select('id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []).length;
}

export async function ensureCanAddSubjects(params: {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  userId: string;
  willAdd: number;
  navigation?: any;
}): Promise<boolean> {
  const { limits, userId, willAdd, navigation } = params;
  // Gate based on limits (source of truth), not just tier string.
  if (limits.maxSubjects === -1) return true;

  const existing = await getUserSubjectCount(userId);
  if (existing + willAdd > limits.maxSubjects) {
    showUpgradePrompt({
      message: 'The Free plan is limited to 1 subject. Upgrade to Premium for unlimited subjects.',
      navigation,
    });
    return false;
  }
  return true;
}

export async function ensureCanAddCards(params: {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  userId: string;
  willAdd: number;
  navigation?: any;
}): Promise<boolean> {
  const { limits, userId, willAdd, navigation } = params;
  if (limits.maxCards === -1) return true;

  const existing = await getUserCardCount(userId);
  if (existing + willAdd > limits.maxCards) {
    showUpgradePrompt({
      message: "You've reached the 10-card limit on the Free plan. Upgrade to Premium for unlimited flashcards.",
      navigation,
    });
    return false;
  }
  return true;
}


