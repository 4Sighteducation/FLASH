import { supabase } from '../services/supabase';

export const debugCards = {
  async checkCardStates(userId: string) {
    try {
      console.log('=== DEBUG: Checking Card States ===');
      
      // Get all cards
      const { data: allCards, error: allError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('next_review_date');
        
      if (allError) {
        console.error('Error fetching all cards:', allError);
        return;
      }
      
      console.log(`Total cards: ${allCards?.length || 0}`);
      
      // Get cards in study bank
      const { data: studyBankCards, error: studyError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .eq('in_study_bank', true)
        .order('next_review_date');
        
      if (studyError) {
        console.error('Error fetching study bank cards:', studyError);
        return;
      }
      
      console.log(`Cards in study bank: ${studyBankCards?.length || 0}`);
      
      // Check cards due now
      const now = new Date();
      const dueCards = studyBankCards?.filter(card => 
        new Date(card.next_review_date) <= now
      ) || [];
      
      console.log(`Cards due now: ${dueCards.length}`);
      
      // Show sample of due cards
      if (dueCards.length > 0) {
        console.log('\nSample due cards:');
        dueCards.slice(0, 5).forEach(card => {
          console.log(`- ${card.question.substring(0, 50)}...`);
          console.log(`  Box: ${card.box_number}, Due: ${card.next_review_date}`);
          console.log(`  Subject: ${card.subject_name}, Topic: ${card.topic}`);
        });
      }
      
      // Check box distribution
      const boxCounts: any = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      studyBankCards?.forEach(card => {
        boxCounts[card.box_number]++;
      });
      
      console.log('\nBox distribution:');
      Object.entries(boxCounts).forEach(([box, count]) => {
        console.log(`Box ${box}: ${count} cards`);
      });
      
      // Check for cards with future dates
      const futureCards = studyBankCards?.filter(card => 
        new Date(card.next_review_date) > now
      ) || [];
      
      console.log(`\nCards with future review dates: ${futureCards.length}`);
      
      if (futureCards.length > 0) {
        console.log('Sample future cards:');
        futureCards.slice(0, 3).forEach(card => {
          const daysUntil = Math.ceil(
            (new Date(card.next_review_date).getTime() - now.getTime()) / 
            (1000 * 60 * 60 * 24)
          );
          console.log(`- ${card.question.substring(0, 50)}...`);
          console.log(`  Due in ${daysUntil} days (${card.next_review_date})`);
        });
      }
      
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Debug error:', error);
    }
  }
}; 