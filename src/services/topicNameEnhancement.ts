import { supabase } from './supabase';
import { getTopicLabel } from '../utils/topicNameUtils';

export interface TopicNameEnhancementParams {
  topicId: string;
  topicName: string;
  subjectName: string;
  parentName?: string;
  grandparentName?: string;
  siblings?: string[];
}

export class TopicNameEnhancementService {
  private static apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://www.fl4sh.cards/api';
  private static failureCount = 0;
  private static lastFailureAtMs = 0;
  private static readonly CIRCUIT_BREAK_MS = 10 * 60 * 1000; // 10 min

  /**
   * Enhance a single topic name using AI
   */
  static async enhanceTopicName(params: TopicNameEnhancementParams): Promise<string> {
    try {
      // Circuit breaker: if the API is returning errors, don't spam requests or LogBox.
      const now = Date.now();
      if (this.failureCount >= 3 && now - this.lastFailureAtMs < this.CIRCUIT_BREAK_MS) {
        return params.topicName;
      }

      console.log('🤖 Enhancing topic name:', params.topicName);

      const response = await fetch(`${this.apiUrl}/enhance-topic-names`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        this.failureCount += 1;
        this.lastFailureAtMs = Date.now();
        // Non-fatal: silently fall back to original name.
        console.log(`⚠️ Topic name enhancement API returned ${response.status}; using original`);
        return params.topicName;
      }

      const data = await response.json();
      
      if (data.success && data.enhanced) {
        console.log('✨ Enhanced:', data.original, '→', data.enhanced);
        return data.enhanced;
      }

      // Non-fatal: fall back to original.
      return params.topicName;
    } catch (error) {
      this.failureCount += 1;
      this.lastFailureAtMs = Date.now();
      // Avoid console.error (LogBox spam); fall back silently.
      console.log('⚠️ Topic name enhancement failed; using original');
      // Return original if enhancement fails
      return params.topicName;
    }
  }

  /**
   * Enhance a batch of topics
   */
  static async enhanceBatch(topics: TopicNameEnhancementParams[]): Promise<void> {
    console.log(`🔄 Enhancing ${topics.length} topic names...`);
    
    const results = await Promise.allSettled(
      topics.map(topic => this.enhanceTopicName(topic))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Enhanced ${successful}/${topics.length} topics`);
  }

  /**
   * Detect and return topics that need enhancement
   */
  static async getTopicsNeedingEnhancement(subjectName?: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('detect_poor_topic_names');

      if (error) {
        console.error('Error detecting poor names:', error);
        return [];
      }

      // Filter by subject if provided
      if (subjectName) {
        return (data || []).filter((t: any) => t.subject_name === subjectName);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTopicsNeedingEnhancement:', error);
      return [];
    }
  }

  /**
   * Check if a topic name needs enhancement
   */
  static needsEnhancement(topicName: string): boolean {
    // Check if name is poor quality
    return (
      topicName.length <= 3 ||
      /^[0-9]+$/.test(topicName) ||
      /^[0-9]+\.[0-9]+/.test(topicName) ||
      /<[^>]+>/.test(topicName) || // HTML blobs
      topicName.length > 120 // overly long "content cells"
    );
  }

  /**
   * Get display name with fallback
   */
  static getDisplayName(topic: { topic_name: string; display_name?: string }): string {
    return getTopicLabel(topic);
  }
}


