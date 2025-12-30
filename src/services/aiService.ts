import { supabase } from './supabase';
import { normalizeExamTrackId } from '../utils/examTracks';

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

/**
 * Map a subject's qualification code / track id to the prompt "examType" expected by `api/generate-cards.js`.
 *
 * Important: This is about *question difficulty/style* (prompting), not DB filtering.
 * We keep DB/search using qualification codes (e.g. A_LEVEL, BTEC_NATIONALS_L3),
 * but the generator prompt expects human-ish labels like "GCSE" / "A-Level".
 */
function examTypeForGenerationPrompt(raw: string | null | undefined): string {
  const v = (raw ?? '').toString().trim();
  if (!v) return 'GCSE';

  // If we can normalize to our stable track ids, use that first.
  const track = normalizeExamTrackId(v);
  if (track === 'INTERNATIONAL_GCSE') return 'iGCSE';
  if (track === 'INTERNATIONAL_A_LEVEL') return 'International A-Level';
  if (track === 'A_LEVEL') return 'A-Level';
  if (track === 'GCSE') return 'GCSE';
  if (track === 'IB') return 'IB';
  if (track === 'VOCATIONAL_L3') return 'A-Level'; // "harder prompt" for Level 3 tracks
  if (track === 'VOCATIONAL_L2') return 'GCSE';
  // SQA track covers multiple actual quals; if we only have the broad track id, default to GCSE.
  // When we have the subject's qualification code (NATIONAL_5/HIGHER/ADVANCED_HIGHER), that will override this branch.
  if (track === 'SQA_NATIONALS') return 'GCSE';

  // Otherwise, we may have a qualification_types.code like BTEC_NATIONALS_L3.
  const upper = v.toUpperCase();

  // Explicit international variants
  if (upper.includes('INTERNATIONAL_A_LEVEL')) return 'International A-Level';
  if (upper.includes('INTERNATIONAL_GCSE')) return 'iGCSE';

  // --- Scottish Nationals mapping ---
  // National 5 ~ GCSE; Higher/Advanced Higher ~ A-Level difficulty.
  if (upper.includes('ADVANCED_HIGHER') || upper === 'ADVANCED_HIGHER') return 'A-Level';
  if (upper.includes('HIGHER') || upper === 'HIGHER') return 'A-Level';
  if (upper.includes('NATIONAL_5') || upper === 'NATIONAL_5') return 'GCSE';

  // --- Vocational mapping ---
  // GCSE-level: BTEC Firsts / Cambridge Nationals (typically Level 2)
  if (upper.includes('BTEC_FIRST') || upper.includes('BTEC_FIRSTS')) return 'GCSE';
  if (upper.includes('CAMBRIDGE_NATIONAL')) return 'GCSE';

  // A-Level-level: Cambridge Technicals / BTEC Nationals (Level 3)
  if (upper.includes('CAMBRIDGE_TECHNICAL')) return 'A-Level';
  if (upper.includes('BTEC_NATIONAL')) return 'A-Level';

  // Level 3 qualifications should use the harder prompt (per request)
  if (upper.includes('_L3') || upper.includes('ADVANCED_HIGHER') || upper === 'HIGHER') return 'A-Level';

  // Level 2 / GCSE-adjacent
  if (upper.includes('_L2') || upper.includes('NATIONAL_5')) return 'GCSE';

  // If it's a plain "BTEC" style value, keep BTEC guidance.
  if (upper === 'BTEC' || upper.includes('BTEC')) return 'BTEC';

  // Fall back to GCSE.
  return 'GCSE';
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
    // Always use production API for mobile devices
    // Localhost doesn't work on phones - they can't reach your computer
    // For web development, use localhost. For mobile, use production.
    
    const Platform = require('react-native').Platform;
    const isDev = __DEV__ ?? false;
    
    // Use production API for mobile devices (even in dev mode)
    // Use localhost only for web development
    if (Platform.OS === 'web' && isDev) {
      this.apiUrl = 'http://localhost:3000/api/generate-cards';  // Web dev only
    } else {
      this.apiUrl = 'https://www.fl4sh.cards/api/generate-cards';  // Mobile + production
    }
    
    console.log('🔑 [AIService] Platform:', Platform.OS, 'Dev:', isDev, 'Using API URL:', this.apiUrl);
  }

  async generateCards(params: CardGenerationParams): Promise<GeneratedCard[]> {
    try {
      console.log('Generating cards with params:', params);
      console.log('API URL:', this.apiUrl);
      const promptExamType = examTypeForGenerationPrompt(params.examType);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: params.subject,
          topic: params.topic,
          // The generator prompt expects GCSE/A-Level style values; don't pass DB qualification codes directly.
          examType: promptExamType,
          examBoard: params.examBoard,
          questionType: params.questionType,
          numCards: params.numCards,
          contentGuidance: params.contentGuidance,
          isOverview: params.isOverview || false,
          childrenTopics: params.childrenTopics || [],
          // Debugging/telemetry only (backend can ignore safely)
          qualificationCode: params.examType,
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