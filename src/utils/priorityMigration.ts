import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

const KEY_PREFIX = 'priorityScaleV2Migrated:';

function toV2Priority(p: number): number | null {
  // Legacy screens used 4=urgent (and sometimes 5=emergency). New scale: 1=highest, 4=lowest.
  if (!p) return null;
  if (p === 5) return 1;
  if (p >= 1 && p <= 4) return 5 - p;
  return null;
}

export async function migrateUserTopicPrioritiesToV2(userId: string): Promise<{ migrated: boolean; updated: number }> {
  const key = `${KEY_PREFIX}${userId}`;
  const already = await AsyncStorage.getItem(key);
  if (already === 'true') return { migrated: false, updated: 0 };

  const { data, error } = await supabase
    .from('user_topic_priorities')
    .select('topic_id, priority')
    .eq('user_id', userId);

  if (error) {
    // Don't block app start on migration.
    console.warn('[priorityMigration] load failed:', error.message);
    return { migrated: false, updated: 0 };
  }

  const rows = (data || []) as Array<{ topic_id: string; priority: number }>;
  if (!rows.length) {
    await AsyncStorage.setItem(key, 'true');
    return { migrated: true, updated: 0 };
  }

  // Heuristic: if any row uses 5, it's definitely legacy.
  // Otherwise, we still migrate because earlier screens inverted 1..4.
  let updated = 0;
  const updates: Array<{ user_id: string; topic_id: string; priority: number; updated_at: string }> = [];
  const now = new Date().toISOString();
  for (const r of rows) {
    const v2 = toV2Priority(Number(r.priority || 0));
    if (!v2) continue;
    if (v2 !== Number(r.priority)) {
      updates.push({ user_id: userId, topic_id: r.topic_id, priority: v2, updated_at: now });
      updated += 1;
    }
  }

  if (updates.length) {
    const { error: upErr } = await supabase.from('user_topic_priorities').upsert(updates, { onConflict: 'user_id,topic_id' });
    if (upErr) {
      console.warn('[priorityMigration] upsert failed:', upErr.message);
      return { migrated: false, updated: 0 };
    }
  }

  await AsyncStorage.setItem(key, 'true');
  return { migrated: true, updated };
}

