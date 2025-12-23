import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

interface SearchParams {
  examBoard: string;
  qualificationLevel: string;
  subjectName: string;
}

interface TopicSearchResult {
  id: string;
  topic_name: string;
  plain_english_summary: string;
  difficulty_band: 'Foundation' | 'Intermediate' | 'Advanced';
  exam_importance: number;
  full_path: string[];
  confidence: number;
  subject_name: string;
  topic_level: number;
}

interface UseTopicSearchReturn {
  searchResults: TopicSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchTopics: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useTopicSearch({
  examBoard,
  qualificationLevel,
  subjectName,
}: SearchParams): UseTopicSearchReturn {
  const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTopics = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the API endpoint that handles embedding generation and vector search
      const response = await fetch('/api/topics/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          examBoard,
          qualificationLevel,
          subjectName,
          limit: 20, // Get top 20 candidates
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // The API returns topics with confidence scores
      setSearchResults(data.results);
    } catch (err) {
      console.error('Topic search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [examBoard, qualificationLevel, subjectName]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchTopics,
    clearResults,
  };
}

// Alternative: Direct Supabase RPC call (if not using API endpoint)
export function useTopicSearchDirect({
  examBoard,
  qualificationLevel,
  subjectName,
}: SearchParams): UseTopicSearchReturn {
  const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTopics = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Generate embedding for the query
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query,
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error('Failed to generate embedding');
      }

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      // Step 2: Call Supabase RPC function for vector search
      const { data: searchData, error: searchError } = await supabase
        .rpc('match_topics', {
          query_embedding: queryEmbedding,
          p_exam_board: examBoard,
          p_qualification_level: qualificationLevel,
          p_subject_name: subjectName,
          // Disambiguate overloaded match_topics() functions (with/without p_match_threshold)
          // Use 0.0 so we don't filter out anything by default.
          p_match_threshold: 0.0,
          p_limit: 20,
        });

      if (searchError) throw searchError;

      // Step 3: Add confidence scores based on similarity
      const resultsWithConfidence = (searchData || []).map((topic: any) => ({
        ...topic,
        id: topic.topic_id,
        confidence: 1 - topic.similarity, // Convert distance to confidence
      }));

      // Step 4: Optional - Pass through LLM for final ranking/filtering
      // This would call another endpoint or function
      // For now, we'll use the vector search results directly

      setSearchResults(resultsWithConfidence);
    } catch (err) {
      console.error('Topic search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [examBoard, qualificationLevel, subjectName]);

  const clearResults = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    isLoading,
    error,
    searchTopics,
    clearResults,
  };
}
