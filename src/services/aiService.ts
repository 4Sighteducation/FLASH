import { supabase } from './supabase';

export interface CardGenerationParams {
  subject: string;
  topic: string;
  examType: string;
  examBoard: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'acronym';
  numCards: number;
  contentGuidance?: string;
  isOverview?: boolean;
  childrenTopics?: string[];
}

export interface GeneratedCard {
  question: string;
  answer?: string;
  options?: string[];
  correctAnswer?: string;
  keyPoints?: string[];
  detailedAnswer?: string;
  acronym?: string;
  explanation?: string;
}

// Exam complexity guidance
const examComplexityGuidance: Record<string, string> = {
  "A-Level": "Focus on in-depth specialized knowledge with emphasis on critical analysis, evaluation and application. Include detailed technical terminology and expect students to demonstrate independent thinking.",
  "GCSE": "Cover foundational knowledge with clear explanations of key concepts. Focus on comprehension and basic application rather than complex analysis. Ensure terminology is appropriate for a broad introduction to the subject.",
  "BTEC": "Focus on practical applications, industry standards, and vocational context.",
  "IB": "Similar to A-Level with critical thinking and application focus, but slightly broader in scope as students take six subjects. Include appropriate technical terminology while balancing depth with the wider curriculum demands."
};

// Card type examples for consistency
const cardExamples = {
  multiple_choice: {
    Biology: {
      question: "Which organelle is primarily responsible for ATP production in eukaryotic cells?",
      options: ["Mitochondria", "Nucleus", "Golgi apparatus", "Lysosome"],
      correctAnswer: "Mitochondria",
      detailedAnswer: "Mitochondria are the powerhouses of the cell where cellular respiration occurs, converting glucose and oxygen into ATP through processes including the Krebs cycle and electron transport chain."
    }
  },
  short_answer: {
    Chemistry: {
      question: "Explain how the rate of reaction is affected by increasing temperature.",
      keyPoints: [
        "Particles gain more kinetic energy",
        "More frequent collisions occur",
        "More collisions exceed the activation energy",
        "Rate of successful collisions increases"
      ],
      detailedAnswer: "When temperature increases, particles gain more kinetic energy, moving faster and colliding more frequently. A greater proportion of these collisions exceed the activation energy required for reaction, resulting in more successful collisions per unit time."
    }
  }
};

export class AIService {
  private apiUrl: string;

  constructor() {
    // Use your backend API instead of OpenAI directly
    // For React Native/Expo, we'll use the __DEV__ global variable
    // In development, this will be http://localhost:3000/api/generate-cards
    // In production, this will be https://your-app.vercel.app/api/generate-cards
    
    // For local development, you might need to use your computer's IP instead of localhost
    // e.g., http://192.168.1.100:3000/api/generate-cards
    const isDev = __DEV__ ?? false;
    
    // Use same domain as web app for API calls
    // This ensures API functions are deployed with the main app
    this.apiUrl = isDev
      ? 'http://localhost:3000/api/generate-cards'  // Local testing
      : 'https://www.fl4sh.cards/api/generate-cards';  // Production
    
    console.log('🔑 [AIService] Using API URL:', this.apiUrl);
  }

  async generateCards(params: CardGenerationParams): Promise<GeneratedCard[]> {
    try {
      console.log('Generating cards with params:', params);
      console.log('API URL:', this.apiUrl);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: params.subject,
          topic: params.topic,
          examType: params.examType,
          examBoard: params.examBoard,
          questionType: params.questionType,
          numCards: params.numCards,
          contentGuidance: params.contentGuidance,
          isOverview: params.isOverview || false,
          childrenTopics: params.childrenTopics || []
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json() as any;
        console.error('API Error:', errorData);
        throw new Error(errorData.error || errorData.message || 'Failed to generate cards');
      }

      const data = await response.json() as any;
      console.log('Response data:', data);
      
      if (data.success && data.cards && Array.isArray(data.cards)) {
        return this.processGeneratedCards(data.cards, params);
      }

      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error generating cards:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        apiUrl: this.apiUrl
      });
      throw error;
    }
  }

  private processGeneratedCards(cards: any[], params: CardGenerationParams): GeneratedCard[] {
    return cards.map(card => {
      const processedCard: GeneratedCard = {
        question: card.question || 'No question generated'
      };

      switch (params.questionType) {
        case 'multiple_choice':
          processedCard.options = card.options || [];
          processedCard.correctAnswer = card.correctAnswer || '';
          processedCard.detailedAnswer = card.detailedAnswer || '';
          // Ensure we have exactly 4 options
          if (processedCard.options) {
            while (processedCard.options.length < 4) {
              processedCard.options.push(`Option ${processedCard.options.length + 1}`);
            }
          }
          break;
        case 'short_answer':
        case 'essay':
          processedCard.keyPoints = card.keyPoints || [];
          processedCard.detailedAnswer = card.detailedAnswer || '';
          processedCard.answer = processedCard.keyPoints ? processedCard.keyPoints.join('\n• ') : '';
          break;
        case 'acronym':
          processedCard.acronym = card.acronym || '';
          processedCard.explanation = card.explanation || '';
          processedCard.answer = `${processedCard.acronym}\n\n${processedCard.explanation}`;
          break;
      }

      return processedCard;
    });
  }

  // Save generated cards to database
  async saveGeneratedCards(
    cards: GeneratedCard[], 
    params: CardGenerationParams & { topicId?: string }, 
    userId: string,
    addToStudyBank: boolean = false
  ): Promise<void> {
    // For AI-generated cards, we'll need a topic_id
    // If not provided, we can use a generic one or create cards without topic_id
    const topicId = params.topicId || null;

    const flashcards = cards.map(card => ({
      user_id: userId,
      topic_id: topicId, // This can be null if creating general cards
      question: card.question,
      answer: card.answer || card.detailedAnswer || '',
      subject_name: params.subject,
      topic: params.topic, // Keep the old field name for compatibility
      topic_name: params.topic,
      card_type: params.questionType,
      options: card.options || null,
      correct_answer: card.correctAnswer || null,
      key_points: card.keyPoints || null,
      detailed_answer: card.detailedAnswer || null,
      next_review_date: new Date().toISOString(),
      box_number: 1, // Note: it's box_number, not box_num in the schema
      is_ai_generated: true,
      in_study_bank: addToStudyBank,
      added_to_study_bank_at: addToStudyBank ? new Date().toISOString() : null,
      is_overview: params.isOverview || false // Mark as overview card
    }));

    console.log('Attempting to save flashcards:', flashcards.length, 'cards');
    console.log('First card data:', flashcards[0]);
    
    const { data, error } = await supabase
      .from('flashcards')
      .insert(flashcards)
      .select();

    if (error) {
      console.error('Error saving flashcards:', error);
      throw error;
    }
    
    console.log('✅ Successfully saved cards:', data?.length, 'cards');

    // If overview cards, also save to topic_overview_cards table
    if (params.isOverview && topicId && data && data.length > 0) {
      console.log('📚 Saving overview cards metadata...');
      const overviewCardRecords = data.map(card => ({
        user_id: userId,
        parent_topic_id: topicId,
        card_id: card.id,
        is_overview: true,
        children_covered: params.childrenTopics || []
      }));

      const { error: overviewError } = await supabase
        .from('topic_overview_cards')
        .insert(overviewCardRecords);

      if (overviewError) {
        console.error('⚠️ Error saving overview metadata:', overviewError);
        // Don't throw - cards are already saved, metadata is optional
      } else {
        console.log('✅ Overview metadata saved successfully');
      }
    }

    // If adding to study bank and topicId exists, update topic preference
    if (addToStudyBank && topicId) {
      const { error: prefError } = await supabase
        .from('topic_study_preferences')
        .upsert({
          user_id: userId,
          topic_id: topicId,
          in_study_bank: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,topic_id'
        });

      if (prefError) {
        console.error('Error updating topic study preference:', prefError);
      }
    }
  }
} 