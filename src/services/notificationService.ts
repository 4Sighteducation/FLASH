import { supabase } from './supabase';
import { LeitnerSystem } from '../utils/leitnerSystem';

interface CardsDueCount {
  total: number;
  bySubject: { [subjectName: string]: number };
  byTopic: { [topicKey: string]: number };
  byBox: { [box: string]: number };
}

export const notificationService = {
  /**
   * Check how many cards are due for review
   */
  async getCardsDueCount(userId: string): Promise<CardsDueCount> {
    try {
      // First get user's active subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', userId);

      if (subjectsError) throw subjectsError;

      const activeSubjects = userSubjects?.map((s: any) => s.subject.subject_name) || [];
      
      if (activeSubjects.length === 0) {
        return {
          total: 0,
          bySubject: {},
          byTopic: {},
          byBox: { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0 }
        };
      }

      // Get all cards in study bank from active subjects only
      const { data: allCards, error } = await supabase
        .from('flashcards')
        .select('subject_name, topic, box_number, next_review_date')
        .eq('user_id', userId)
        .eq('in_study_bank', true)
        .in('subject_name', activeSubjects);
        
      if (error) throw error;
      
      // Filter for cards that are due
      const cards = allCards?.filter(card => 
        LeitnerSystem.isCardDue(card.next_review_date)
      ) || [];

      const count: CardsDueCount = {
        total: cards?.length || 0,
        bySubject: {},
        byTopic: {},
        byBox: { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0 }
      };

      cards?.forEach(card => {
        // Count by subject
        if (!count.bySubject[card.subject_name]) {
          count.bySubject[card.subject_name] = 0;
        }
        count.bySubject[card.subject_name]++;

        // Count by topic (using subject_name:topic as key)
        const topicKey = `${card.subject_name}:${card.topic}`;
        if (!count.byTopic[topicKey]) {
          count.byTopic[topicKey] = 0;
        }
        count.byTopic[topicKey]++;

        // Count by box
        const boxKey = `box${card.box_number}` as keyof typeof count.byBox;
        count.byBox[boxKey]++;
      });

      return count;
    } catch (error) {
      console.error('Error getting cards due count:', error);
      return {
        total: 0,
        bySubject: {},
        byTopic: {},
        byBox: { box1: 0, box2: 0, box3: 0, box4: 0, box5: 0 }
      };
    }
  },

  /**
   * Get user's current stats
   */
  async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

      return data || {
        total_points: 0,
        current_streak: 0,
        total_cards_reviewed: 0,
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return {
        total_points: 0,
        current_streak: 0,
        total_cards_reviewed: 0,
      };
    }
  },

  /**
   * Get recent achievements
   */
  async getRecentAchievements(userId: string, limit = 3) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting achievements:', error);
      return [];
    }
  }
}; 