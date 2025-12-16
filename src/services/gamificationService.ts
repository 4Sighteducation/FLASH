import { supabase } from './supabase';

type StudyBox = 1 | 2 | 3 | 4 | 5;

export const gamificationConfig = {
  // Study (flashcards) points for a correct answer while a card is in a given box
  studyPointsByBox: {
    1: 12,
    2: 60,
    3: 120,
    4: 360,
    5: 500,
  } satisfies Record<StudyBox, number>,

  // When a card is wrong and returns to box 1:
  // - first wrong since last correct => half points
  // - second+ wrong streak => quarter points
  wrongMultipliers: {
    firstWrong: 0.5,
    repeatWrong: 0.25,
  },

  // Paper points
  paper: {
    pointsPerMarkFirstAttempt: 25,
    completionBonus: 200,
    percentageBonus: [
      { min: 0, max: 15, points: 0 },
      { min: 15, max: 30, points: 50 },
      { min: 30, max: 40, points: 100 },
      { min: 40, max: 50, points: 200 },
      { min: 50, max: 60, points: 500 },
      { min: 60, max: 70, points: 1000 },
      { min: 70, max: 80, points: 2000 },
      { min: 80, max: 90, points: 5000 },
      { min: 90, max: 99, points: 10000 },
      { min: 99, max: 100, points: 50000 }, // treat 100 separately in caller if needed
    ],
  },

  // Generic actions (wizard complete, first card, prioritise topic etc.)
  genericActionPoints: 25,
};

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function isSameDay(aIso?: string | null, bIso?: string | null) {
  if (!aIso || !bIso) return false;
  const a = new Date(aIso);
  const b = new Date(bIso);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(lastIso?: string | null) {
  if (!lastIso) return false;
  const last = new Date(lastIso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return (
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate()
  );
}

export const gamificationService = {
  async getConsecutiveWrongCount(userId: string, flashcardId: string): Promise<number> {
    // Count consecutive wrong answers since the last correct. (Looks at latest reviews.)
    const { data, error } = await supabase
      .from('card_reviews')
      .select('was_correct')
      .eq('user_id', userId)
      .eq('flashcard_id', flashcardId)
      .order('reviewed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('[Gamification] Failed to load card_reviews for streak:', error);
      return 0;
    }

    let wrong = 0;
    for (const r of data || []) {
      if (r.was_correct === true) break;
      if (r.was_correct === false) wrong += 1;
    }
    return wrong;
  },

  async computeStudyPointsForReview(params: {
    userId: string;
    flashcardId: string;
    oldBoxNumber: number;
    wasCorrect: boolean;
  }): Promise<number> {
    const oldBox = Math.min(5, Math.max(1, Number(params.oldBoxNumber) || 1)) as StudyBox;
    const base = gamificationConfig.studyPointsByBox[oldBox] ?? gamificationConfig.studyPointsByBox[1];

    if (params.wasCorrect) return base;

    // Wrong: apply half/quarter based on consecutive wrong streak
    const priorWrong = await this.getConsecutiveWrongCount(params.userId, params.flashcardId);
    const multiplier = priorWrong === 0 ? gamificationConfig.wrongMultipliers.firstWrong : gamificationConfig.wrongMultipliers.repeatWrong;
    return Math.round(base * multiplier);
  },

  async upsertUserStatsDelta(params: {
    userId: string;
    pointsDelta: number;
    cardsReviewedDelta?: number;
    correctDelta?: number;
    incorrectDelta?: number;
  }) {
    const { userId, pointsDelta, cardsReviewedDelta = 0, correctDelta = 0, incorrectDelta = 0 } = params;
    const todayIso = startOfTodayISO();

    // Load current stats (if any)
    const { data: existing } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const lastStudy = (existing as any)?.last_study_date as string | null | undefined;
    const existingStreak = Number((existing as any)?.current_streak || 0);

    let newStreak = existingStreak;
    if (!lastStudy) newStreak = 1;
    else if (isSameDay(lastStudy, todayIso)) newStreak = existingStreak;
    else if (isYesterday(lastStudy)) newStreak = existingStreak + 1;
    else newStreak = 1;

    const patch: any = {
      user_id: userId,
      total_points: Number((existing as any)?.total_points || 0) + pointsDelta,
      current_streak: newStreak,
      total_cards_reviewed: Number((existing as any)?.total_cards_reviewed || 0) + cardsReviewedDelta,
      total_correct_answers: Number((existing as any)?.total_correct_answers || 0) + correctDelta,
      updated_at: new Date().toISOString(),
    };

    // Best-effort add last_study_date (schema differs across projects)
    patch.last_study_date = todayIso;

    const { error: upsertError } = await supabase.from('user_stats').upsert(patch, { onConflict: 'user_id' });
    if (upsertError) {
      // If column doesn't exist, retry without it
      if (String((upsertError as any).message || '').includes('last_study_date')) {
        const { last_study_date, ...retryPatch } = patch;
        await supabase.from('user_stats').upsert(retryPatch, { onConflict: 'user_id' });
      } else {
        console.warn('[Gamification] Failed to upsert user_stats:', upsertError);
      }
    }

    // Keep users.current_streak in sync (used elsewhere in onboarding/admin)
    const { error: usersErr } = await supabase
      .from('users')
      .update({ current_streak: newStreak })
      .eq('id', userId);
    if (usersErr) {
      // non-fatal
      console.warn('[Gamification] Failed to update users.current_streak:', usersErr);
    }
  },
};


