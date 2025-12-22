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

  /**
   * Enhance a single topic name using AI
   */
  static async enhanceTopicName(params: TopicNameEnhancementParams): Promise<string> {
    try {
      console.log('🤖 Enhancing topic name:', params.topicName);

      const response = await fetch(`${this.apiUrl}/enhance-topic-names`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.enhanced) {
        console.log('✨ Enhanced:', data.original, '→', data.enhanced);
        return data.enhanced;
      }

      throw new Error('Invalid response from enhancement API');
    } catch (error) {
      console.error('❌ Error enhancing topic name:', error);
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


