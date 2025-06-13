/**
 * Centralized Leitner Box System Logic
 * This ensures consistency across all components
 */

export const LeitnerSystem = {
  // Days until next review for each box
  REVIEW_INTERVALS: [1, 2, 3, 7, 30], // Box 1-5 (Box 1 = tomorrow, not today)
  
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
   * Format the review schedule for display
   */
  getReviewScheduleText(boxNumber: number): string {
    const intervals = ['Tomorrow', 'Every 2 days', 'Every 3 days', 'Weekly', 'Monthly'];
    return intervals[boxNumber - 1];
  }
}; 