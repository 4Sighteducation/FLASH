/**
 * Centralized Leitner Box System Logic
 * This ensures consistency across all components
 */

export const LeitnerSystem = {
  // Days until next review for each box
  REVIEW_INTERVALS: [0, 2, 3, 7, 30], // Box 1-5
  
  /**
   * Calculate the next review date based on box number
   * Cards are available at midnight on the review day
   */
  getNextReviewDate(boxNumber: number): Date {
    const daysUntilReview = this.REVIEW_INTERVALS[boxNumber - 1];
    const nextReview = new Date();
    
    if (daysUntilReview === 0) {
      // Box 1: Available immediately
      return nextReview;
    }
    
    // Set to midnight of the review day
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
    const intervals = ['Daily', 'Every 2 days', 'Every 3 days', 'Weekly', 'Monthly'];
    return intervals[boxNumber - 1];
  }
}; 