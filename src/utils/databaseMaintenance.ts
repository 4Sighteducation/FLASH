import { supabase } from '../services/supabase';

/**
 * Removes orphaned cards from study mode for a specific user
 * Orphaned cards are those whose subjects no longer exist in the user's active subjects
 */
export async function cleanupOrphanedCards(userId: string) {
  try {
    // First, get the user's active subjects
    const { data: userSubjects, error: subjectsError } = await supabase
      .from('user_subjects')
      .select(`
        subject_id,
        subject:exam_board_subjects!subject_id(subject_name)
      `)
      .eq('user_id', userId);

    if (subjectsError) throw subjectsError;

    const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];

    // Find orphaned cards
    const { data: orphanedCards, error: fetchError } = await supabase
      .from('flashcards')
      .select('id, subject_name')
      .eq('user_id', userId)
      .eq('in_study_bank', true)
      .not('subject_name', 'in', `(${activeSubjects.map(s => `"${s}"`).join(',')})`);

    if (fetchError) throw fetchError;

    if (!orphanedCards || orphanedCards.length === 0) {
      return { success: true, orphanedCount: 0 };
    }

    // Remove orphaned cards from study bank
    const orphanedIds = orphanedCards.map(card => card.id);
    const { error: updateError } = await supabase
      .from('flashcards')
      .update({ in_study_bank: false })
      .in('id', orphanedIds);

    if (updateError) throw updateError;

    return { 
      success: true, 
      orphanedCount: orphanedCards.length,
      orphanedSubjects: [...new Set(orphanedCards.map(c => c.subject_name))]
    };
  } catch (error) {
    console.error('Error cleaning up orphaned cards:', error);
    return { success: false, error };
  }
}

/**
 * Gets statistics about orphaned cards for a user
 */
export async function getOrphanedCardsStats(userId: string) {
  try {
    // Get user's active subjects
    const { data: userSubjects, error: subjectsError } = await supabase
      .from('user_subjects')
      .select(`
        subject_id,
        subject:exam_board_subjects!subject_id(subject_name)
      `)
      .eq('user_id', userId);

    if (subjectsError) throw subjectsError;

    const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];

    // Get all user's cards
    const { data: allCards, error: cardsError } = await supabase
      .from('flashcards')
      .select('subject_name, in_study_bank')
      .eq('user_id', userId);

    if (cardsError) throw cardsError;

    // Calculate stats
    const orphanedCards = allCards?.filter(
      card => !activeSubjects.includes(card.subject_name)
    ) || [];

    const orphanedInStudy = orphanedCards.filter(
      card => card.in_study_bank === true
    ).length;

    const orphanedSubjects = [...new Set(orphanedCards.map(c => c.subject_name))];

    return {
      totalOrphaned: orphanedCards.length,
      orphanedInStudy,
      orphanedSubjects,
      activeSubjects
    };
  } catch (error) {
    console.error('Error getting orphaned cards stats:', error);
    return null;
  }
} 