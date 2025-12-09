/**
 * Centralized Leitner Box System Logic
 * This ensures consistency across all components
 * 
 * Updated with user-friendly names and clear review intervals
 */

export interface BoxInfo {
  number: number;
  name: string;
  emoji: string;
  days: number;
  displayInterval: string;
  shortInterval: string; // For compact display
  description: string;
}

export const LeitnerSystem = {
  // Days until next review for each box
  REVIEW_INTERVALS: [1, 2, 3, 7, 21], // Updated: Box 5 is 21 days (3 weeks)
  
  // Box metadata with user-friendly names
  BOX_INFO: {
    1: {
      number: 1,
      name: 'New',
      emoji: '🌱',
      days: 1,
      displayInterval: 'every day',
      shortInterval: 'Daily',
      description: 'Fresh cards you\'re seeing for the first time. Review daily to move them forward.',
    },
    2: {
      number: 2,
      name: 'Learning',
      emoji: '📚',
      days: 2,
      displayInterval: 'every 2 days',
      shortInterval: 'Every 2 days',
      description: 'Cards you\'re getting the hang of. Keep practicing every other day.',
    },
    3: {
      number: 3,
      name: 'Growing',
      emoji: '🚀',
      days: 3,
      displayInterval: 'every 3 days',
      shortInterval: 'Every 3 days',
      description: 'You know these but need regular practice. Review every 3 days.',
    },
    4: {
      number: 4,
      name: 'Strong',
      emoji: '💪',
      days: 7,
      displayInterval: 'weekly',
      shortInterval: 'Weekly',
      description: 'Almost mastered! Just weekly check-ins to stay sharp.',
    },
    5: {
      number: 5,
      name: 'Mastered',
      emoji: '🏆',
      days: 21,
      displayInterval: 'every 3 weeks',
      shortInterval: 'Every 3 weeks',
      description: 'You\'ve got this! Rare reviews to keep them in long-term memory.',
    },
  } as Record<number, BoxInfo>,
  
  /**
   * Get box information
   */
  getBoxInfo(boxNumber: number): BoxInfo {
    return this.BOX_INFO[boxNumber] || this.BOX_INFO[1];
  },
  
  /**
   * Get box name with emoji (e.g., "New 🌱")
   */
  getBoxDisplayName(boxNumber: number): string {
    const box = this.getBoxInfo(boxNumber);
    return `${box.name} ${box.emoji}`;
  },
  
  /**
   * Get compact box display (e.g., "New 🌱 (Daily)")
   */
  getBoxCompactDisplay(boxNumber: number): string {
    const box = this.getBoxInfo(boxNumber);
    return `${box.name} ${box.emoji} (${box.shortInterval})`;
  },
  
  /**
   * Calculate the next review date based on box number
   * Cards are available at midnight on the review day
   * @param boxNumber - The box number (1-5)
   * @param isNewCard - Whether this is a newly created card (only applies to box 1)
   */
  getNextReviewDate(boxNumber: number, isNewCard: boolean = false): Date {
    const daysUntilReview = this.REVIEW_INTERVALS[boxNumber - 1];
    const nextReview = new Date();
    
    if (boxNumber === 1) {
      if (isNewCard) {
        // New cards in Box 1: Available immediately
        return nextReview;
      } else {
        // Incorrect answers to Box 1: Available tomorrow
        // This prevents users from repeatedly attempting the same card
        nextReview.setDate(nextReview.getDate() + 1);
        nextReview.setHours(0, 0, 0, 0);
        return nextReview;
      }
    }
    
    // For other boxes, add the specified days
    nextReview.setDate(nextReview.getDate() + daysUntilReview);
    nextReview.setHours(0, 0, 0, 0);
    
    return nextReview;
  },
  
  /**
   * Check if a card is due for review
   * A card is due if its review date has passed
   */
  isCardDue(nextReviewDate: string | Date): boolean {
    const reviewDate = new Date(nextReviewDate);
    const now = new Date();
    
    // For box 1 cards (same day), they're always due
    if (reviewDate.toDateString() === now.toDateString() && reviewDate.getHours() === 0) {
      return true;
    }
    
    return reviewDate <= now;
  },
  
  /**
   * Get the new box number after answering
   */
  getNewBoxNumber(currentBox: number, isCorrect: boolean): number {
    if (isCorrect) {
      return Math.min(currentBox + 1, 5);
    }
    return 1; // Incorrect always goes to box 1
  },
  
  /**
   * Format the review schedule for display (DEPRECATED - use getBoxInfo)
   * @deprecated Use getBoxInfo(boxNumber).displayInterval instead
   */
  getReviewScheduleText(boxNumber: number): string {
    return this.getBoxInfo(boxNumber).displayInterval;
  }
}; 