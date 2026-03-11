import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'reviewPrompt:';
const KEYS = {
  firstLaunchAtMs: `${KEY_PREFIX}firstLaunchAtMs`,
  launchCount: `${KEY_PREFIX}launchCount`,
  lastPromptAtMs: `${KEY_PREFIX}lastPromptAtMs`,
  promptCount: `${KEY_PREFIX}promptCount`,
  optedOut: `${KEY_PREFIX}optedOut`,
  reviewedAtMs: `${KEY_PREFIX}reviewedAtMs`,
} as const;

type ReviewPromptState = {
  firstLaunchAtMs: number | null;
  launchCount: number;
  lastPromptAtMs: number | null;
  promptCount: number;
  optedOut: boolean;
  reviewedAtMs: number | null;
};

function toInt(value: string | null, fallback: number): number {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toBool(value: string | null): boolean {
  return value === '1' || value === 'true';
}

export async function getReviewPromptState(): Promise<ReviewPromptState> {
  const [firstLaunchAtMs, launchCount, lastPromptAtMs, promptCount, optedOut, reviewedAtMs] =
    await AsyncStorage.multiGet([
      KEYS.firstLaunchAtMs,
      KEYS.launchCount,
      KEYS.lastPromptAtMs,
      KEYS.promptCount,
      KEYS.optedOut,
      KEYS.reviewedAtMs,
    ]);

  return {
    firstLaunchAtMs: toInt(firstLaunchAtMs?.[1] ?? null, -1) >= 0 ? toInt(firstLaunchAtMs?.[1] ?? null, -1) : null,
    launchCount: Math.max(0, toInt(launchCount?.[1] ?? null, 0)),
    lastPromptAtMs: toInt(lastPromptAtMs?.[1] ?? null, -1) >= 0 ? toInt(lastPromptAtMs?.[1] ?? null, -1) : null,
    promptCount: Math.max(0, toInt(promptCount?.[1] ?? null, 0)),
    optedOut: toBool(optedOut?.[1] ?? null),
    reviewedAtMs: toInt(reviewedAtMs?.[1] ?? null, -1) >= 0 ? toInt(reviewedAtMs?.[1] ?? null, -1) : null,
  };
}

export async function recordAppLaunch(nowMs: number = Date.now()): Promise<ReviewPromptState> {
  const state = await getReviewPromptState();

  const firstLaunchAtMs = state.firstLaunchAtMs ?? nowMs;
  const launchCount = state.launchCount + 1;

  await AsyncStorage.multiSet([
    [KEYS.firstLaunchAtMs, String(firstLaunchAtMs)],
    [KEYS.launchCount, String(launchCount)],
  ]);

  return { ...state, firstLaunchAtMs, launchCount };
}

export function shouldShowReviewPrompt(state: ReviewPromptState, nowMs: number = Date.now()) {
  // Hard opt-outs
  if (state.optedOut) return false;
  if (state.reviewedAtMs != null) return false;

  // Frequency caps
  if (state.promptCount >= 3) return false;

  const daysSinceFirstLaunch =
    state.firstLaunchAtMs == null ? 0 : Math.floor((nowMs - state.firstLaunchAtMs) / (1000 * 60 * 60 * 24));
  const daysSinceLastPrompt =
    state.lastPromptAtMs == null ? Number.POSITIVE_INFINITY : (nowMs - state.lastPromptAtMs) / (1000 * 60 * 60 * 24);

  // Gentle gating: ask only after meaningful usage.
  if (state.launchCount < 8) return false;
  if (daysSinceFirstLaunch < 3) return false;

  // Don’t spam
  if (daysSinceLastPrompt < 28) return false;

  return true;
}

export async function markPromptShown(nowMs: number = Date.now()) {
  const state = await getReviewPromptState();
  const nextPromptCount = state.promptCount + 1;
  await AsyncStorage.multiSet([
    [KEYS.lastPromptAtMs, String(nowMs)],
    [KEYS.promptCount, String(nextPromptCount)],
  ]);
}

export async function markOptedOut(nowMs: number = Date.now()) {
  await AsyncStorage.multiSet([
    [KEYS.optedOut, '1'],
    [KEYS.lastPromptAtMs, String(nowMs)],
  ]);
}

export async function markReviewed(nowMs: number = Date.now()) {
  await AsyncStorage.multiSet([
    [KEYS.reviewedAtMs, String(nowMs)],
    [KEYS.optedOut, '1'],
    [KEYS.lastPromptAtMs, String(nowMs)],
  ]);
}

