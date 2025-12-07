export interface AnalysisResult {
  isCorrect: boolean;
  confidence: number; // 0-100
  feedback: string;
  keyPointsCovered?: string[];
  keyPointsMissed?: string[];
  suggestions?: string[];
}

export class AIAnalyzerService {
  private apiUrl: string;

  constructor() {
    // Use the same backend API pattern
    this.apiUrl = 'https://www.fl4sh.cards/api/analyze-answer';
  }

  async analyzeAnswer(
    spokenAnswer: string,
    correctAnswer: string,
    cardType: 'short_answer' | 'essay' | 'acronym',
    keyPoints?: string[]
  ): Promise<AnalysisResult> {
    try {
      console.log('Analyzing answer:', { 
        spokenLength: spokenAnswer.length, 
        cardType,
        hasKeyPoints: !!keyPoints 
      });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spokenAnswer,
          correctAnswer,
          cardType,
          keyPoints,
        }),
      });

      console.log('Analysis response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Analysis API Error:', errorData);
        throw new Error(errorData.error || 'Failed to analyze answer');
      }

      const data = await response.json();
      console.log('Analysis result:', data);

      if (data.success && data.analysis) {
        return data.analysis;
      }

      // Fallback to basic comparison if API fails
      return this.basicAnalysis(spokenAnswer, correctAnswer, cardType);
    } catch (error) {
      console.error('Error analyzing answer:', error);
      // Fallback to basic comparison
      return this.basicAnalysis(spokenAnswer, correctAnswer, cardType);
    }
  }

  // Basic fallback analysis when API is unavailable
  private basicAnalysis(
    spokenAnswer: string,
    correctAnswer: string,
    cardType: string
  ): AnalysisResult {
    const spoken = spokenAnswer.toLowerCase().trim();
    const correct = correctAnswer.toLowerCase().trim();

    // Simple similarity check
    const similarity = this.calculateSimilarity(spoken, correct);
    const isCorrect = similarity > 0.7; // 70% threshold

    return {
      isCorrect,
      confidence: Math.round(similarity * 100),
      feedback: isCorrect 
        ? 'Your answer appears to be correct!' 
        : 'Your answer seems to be missing some key information.',
      suggestions: isCorrect ? [] : ['Try to include more details from the correct answer'],
    };
  }

  // Simple word-based similarity calculation
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    
    return Math.min(similarity, 1);
  }

  // Analyze acronym answers specifically
  async analyzeAcronymAnswer(
    spokenAnswer: string,
    acronym: string,
    explanation: string
  ): Promise<AnalysisResult> {
    // For acronyms, we need to check if they mentioned each letter's meaning
    const letters = acronym.split('').filter(char => /[A-Za-z]/.test(char));
    const spokenLower = spokenAnswer.toLowerCase();
    
    // Extract what each letter stands for from the explanation
    const letterMeanings = this.extractAcronymMeanings(acronym, explanation);
    
    const covered: string[] = [];
    const missed: string[] = [];
    
    letterMeanings.forEach(({ letter, meaning }) => {
      if (spokenLower.includes(meaning.toLowerCase())) {
        covered.push(`${letter} - ${meaning}`);
      } else {
        missed.push(`${letter} - ${meaning}`);
      }
    });

    const confidence = (covered.length / letterMeanings.length) * 100;
    const isCorrect = confidence >= 70; // 70% threshold for acronyms

    return {
      isCorrect,
      confidence: Math.round(confidence),
      feedback: isCorrect 
        ? `Great! You covered ${covered.length} out of ${letterMeanings.length} components.`
        : `You covered ${covered.length} out of ${letterMeanings.length} components. Keep practicing!`,
      keyPointsCovered: covered,
      keyPointsMissed: missed,
      suggestions: missed.length > 0 
        ? [`Remember to mention: ${missed.map(m => m.split(' - ')[1]).join(', ')}`]
        : [],
    };
  }

  private extractAcronymMeanings(acronym: string, explanation: string): Array<{letter: string, meaning: string}> {
    // Simple extraction - this could be improved with better parsing
    const meanings: Array<{letter: string, meaning: string}> = [];
    const lines = explanation.split(/[,\n]/);
    
    acronym.split('').forEach((letter, index) => {
      if (/[A-Za-z]/.test(letter)) {
        // Try to find the meaning for this letter in the explanation
        const pattern = new RegExp(`${letter}[:\\-\\s]+([^,\n]+)`, 'i');
        const match = explanation.match(pattern);
        
        if (match) {
          meanings.push({ letter: letter.toUpperCase(), meaning: match[1].trim() });
        } else if (lines[index]) {
          // Fallback: assume order matches
          meanings.push({ letter: letter.toUpperCase(), meaning: lines[index].trim() });
        }
      }
    });
    
    return meanings;
  }
}

export const aiAnalyzerService = new AIAnalyzerService(); 