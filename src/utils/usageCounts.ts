import { supabase } from '../services/supabase';

export async function getUserFlashcardCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const { count, error } = await supabase
      .from('flashcards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}


