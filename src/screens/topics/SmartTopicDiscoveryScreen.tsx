import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { getTopicLabel, sanitizeTopicLabel } from '../../utils/topicNameUtils';
import FeedbackPill from '../../components/support/FeedbackPill';

const TOPIC_SEARCH_ENDPOINTS = [
  process.env.EXPO_PUBLIC_TOPIC_SEARCH_URL,
  'https://www.fl4sh.cards/api/search-topics',
  'https://www.fl4sh.cards/api/topics/search-topics',
  // Legacy Vercel endpoint must include /api
  'https://flash-mw9kep9bm-tony-dennis-projects.vercel.app/api/search-topics',
  'https://flash-mw9kep9bm-tony-dennis-projects.vercel.app/api/topics/search-topics',
].filter(Boolean) as string[];

interface TopicSearchResult {
  topic_id: string;
  topic_name: string;
  plain_english_summary: string;
  difficulty_band: string;
  exam_importance: number;
  full_path: string[];
  similarity: number;
  subject_name: string;
  exam_board: string;
  qualification_level: string;
  topic_level: number;
}

interface RecentTopic {
  topic_id: string;
  topic_name: string;
  display_name?: string | null;
  search_query: string;
  discovered_at: string;
}

export default function SmartTopicDiscoveryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  const { subjectId, subjectName, examBoard, examType } = route.params as any;
  
  const [mode, setMode] = useState<'search' | 'browse'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([]);
  const [recentTopics, setRecentTopics] = useState<RecentTopic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicSearchResult | null>(null);
  const [detailsTopic, setDetailsTopic] = useState<TopicSearchResult | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  // Map exam type to database code format
  const examTypeToCode: { [key: string]: string } = {
    'gcse': 'GCSE',
    'alevel': 'A_LEVEL',
    'aslevel': 'AS_LEVEL',
    'btec': 'BTEC',
    'ib': 'IB',
    'igcse': 'INTERNATIONAL_GCSE',
    'internationalgcse': 'INTERNATIONAL_GCSE',
    'international-gcse': 'INTERNATIONAL_GCSE',
    'internationalalevel': 'INTERNATIONAL_A_LEVEL',
    'international-alevel': 'INTERNATIONAL_A_LEVEL',
  };

  useEffect(() => {
    fetchRecentTopics();
    fetchSmartSuggestions();
  }, []);

  const fetchRecentTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_discovered_topics')
        .select(`
          topic_id,
          search_query,
          discovered_at,
          topic:curriculum_topics(topic_name, display_name)
        `)
        .eq('user_id', user?.id)
        .eq('subject_id', subjectId)
        .order('discovered_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        topic_id: item.topic_id,
        topic_name: item.topic?.topic_name || 'Unknown',
        display_name: item.topic?.display_name || null,
        search_query: item.search_query || '',
        discovered_at: item.discovered_at,
      }));

      setRecentTopics(formatted);
    } catch (error) {
      console.error('Error fetching recent topics:', error);
    }
  };

  const fetchSmartSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      
      // Map exam type to database format
      const qualificationLevel = examTypeToCode[examType?.toLowerCase()] || examType?.toUpperCase() || 'GCSE';
      
      // subjectName already includes exam type: "Biology (GCSE)"
      // Don't append exam type again!
      const fullSubjectName = subjectName;
      
      console.log('🧠 Fetching smart suggestions for:', { 
        fullSubject: fullSubjectName,
        level: qualificationLevel 
      });

      // Helper: if AI metadata isn't available for this course (common for newer boards/quals),
      // fall back to sensible curriculum-based suggestions instead of generic placeholders.
      const getCurriculumFallback = async (): Promise<string[]> => {
        try {
          if (!subjectId) return [];
          const { data: topics, error: topicsError } = await supabase
            .from('curriculum_topics')
            .select('topic_name, topic_level, sort_order')
            .eq('exam_board_subject_id', subjectId)
            .gte('topic_level', 2)
            .lte('topic_level', 4)
            .order('sort_order', { ascending: true })
            .order('topic_name', { ascending: true })
            .limit(30);

          if (topicsError) {
            console.log('⚠️ Curriculum fallback query failed (non-fatal):', topicsError);
            return [];
          }

          const cleaned = (topics || [])
            .map((t: any) => String(t?.topic_name || '').trim())
            .filter(Boolean)
            .map((topicName: string) => {
              // Remove leading numeric spec codes (e.g., "6.1 ", "3.4.5 ")
              const withoutCodes = topicName.replace(/^[\d.]+\s+/, '').trim();
              return sanitizeTopicLabel(withoutCodes, { maxLength: 64 });
            })
            .filter(Boolean);

          // Deduplicate, keep order, and take first 4.
          const seen = new Set<string>();
          const unique = cleaned.filter((x) => {
            if (!x) return false;
            if (seen.has(x)) return false;
            seen.add(x);
            return true;
          });
          return unique.slice(0, 4);
        } catch (e) {
          console.log('⚠️ Curriculum fallback threw (non-fatal):', e);
          return [];
        }
      };
      
      // Call database function to get smart topic suggestions
      // Excludes topics the user already has cards for
      const { data, error } = await supabase
        .rpc('get_smart_topic_suggestions', {
          p_subject_name: fullSubjectName,  // Use full name with exam type
          p_qualification_level: qualificationLevel,
          p_user_id: user?.id,  // Pass user ID to exclude their topics
          p_limit: 4
        });

      if (error) {
        console.error('❌ Error fetching smart suggestions:', error);
        const fallback = await getCurriculumFallback();
        if (fallback.length > 0) {
          setSmartSuggestions(fallback);
        } else {
          // Last-resort generic suggestions
          setSmartSuggestions(['photosynthesis', 'atoms', 'world war 2', 'quadratic equations']);
        }
        return;
      }

      if (data && data.length > 0) {
        // Strip topic codes (e.g., "6.1 ", "3.4 ", "1.2.3 ") from topic names
        const suggestions = data.map((item: any) => {
          const topicName = item.topic_name;
          // Remove leading numbers, periods, and spaces (e.g., "6.1 " or "3.4.5 ")
          const withoutCodes = topicName.replace(/^[\d.]+\s+/, '').trim();
          // Never show spec blobs as "popular topics" chips
          return sanitizeTopicLabel(withoutCodes, { maxLength: 64 });
        });
        console.log('✅ Smart suggestions loaded:', suggestions);
        setSmartSuggestions(suggestions);
      } else {
        console.log('⚠️ No suggestions found, using fallback');
        const fallback = await getCurriculumFallback();
        if (fallback.length > 0) {
          setSmartSuggestions(fallback);
        } else {
          // Last-resort generic suggestions
          setSmartSuggestions(['photosynthesis', 'atoms', 'world war 2', 'quadratic equations']);
        }
      }
    } catch (error) {
      console.error('❌ Exception fetching suggestions:', error);
      try {
        // Try curriculum fallback first
        const { data: topics } = await supabase
          .from('curriculum_topics')
          .select('topic_name, topic_level, sort_order')
          .eq('exam_board_subject_id', subjectId)
          .gte('topic_level', 2)
          .lte('topic_level', 4)
          .order('sort_order', { ascending: true })
          .order('topic_name', { ascending: true })
          .limit(30);
        const cleaned = (topics || [])
          .map((t: any) => String(t?.topic_name || '').trim())
          .filter(Boolean)
          .map((topicName: string) => {
            const withoutCodes = topicName.replace(/^[\d.]+\s+/, '').trim();
            return sanitizeTopicLabel(withoutCodes, { maxLength: 64 });
          });
        const seen = new Set<string>();
        const unique = cleaned.filter((x) => x && !seen.has(x) && (seen.add(x), true));
        if (unique.length > 0) {
          setSmartSuggestions(unique.slice(0, 4));
        } else {
          setSmartSuggestions(['photosynthesis', 'atoms', 'world war 2', 'quadratic equations']);
        }
      } catch {
        // Final fallback to generic
        setSmartSuggestions(['photosynthesis', 'atoms', 'world war 2', 'quadratic equations']);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = (query: string) => {
    // Ensure suggestions / pasted text doesn't become a blob query
    const cleanedQuery = sanitizeTopicLabel(query, { maxLength: 120 });
    setSearchQuery(cleanedQuery);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (cleanedQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      performSearch(cleanedQuery);
    }, 500);
  };

  const openDetails = (topic: TopicSearchResult) => {
    setDetailsTopic(topic);
  };

  const closeDetails = () => {
    setDetailsTopic(null);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);

    try {
      const qualificationLevel = examTypeToCode[examType?.toLowerCase()] || examType?.toUpperCase() || 'GCSE';
      
      const searchParams = {
        query,
        examBoard,
        qualificationLevel,
        subjectName,
        limit: 15,
      };
      
      console.log('🔍 Searching with params:', searchParams);

      let lastError: any = null;
      for (const endpoint of TOPIC_SEARCH_ENDPOINTS) {
        try {
          console.log('🌐 Topic search endpoint:', endpoint);
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchParams),
          });

          const rawText = await response.text();
          console.log('📡 Response status:', response.status);

          if (!response.ok) {
            lastError = new Error(`HTTP ${response.status}: ${rawText.slice(0, 300)}`);
            continue;
          }

          const data = rawText ? JSON.parse(rawText) : {};
          console.log('📊 Search results:', data);

          const success = typeof data?.success === 'boolean' ? data.success : true;
          const results = data?.results || [];

          if (!success) {
            lastError = new Error(data?.message || 'Search failed');
            continue;
          }

        const rawResults = data.results || [];
        console.log(`✅ Found ${rawResults.length} raw topics`);
        
        // SMART FILTERING & RANKING
        
        // Step 1: Remove duplicate parent-child topics
        const deduplicated = rawResults.filter((result: TopicSearchResult, index: number, array: TopicSearchResult[]) => {
          // Keep topic if no more specific child exists in results
          const hasMoreSpecificChild = array.some(other => 
            other.full_path && 
            result.full_path &&
            other.full_path.length > result.full_path.length && // Child is deeper
            other.full_path.slice(0, result.full_path.length).join('/') === result.full_path.join('/') && // Shares same path
            other.topic_level > result.topic_level // Is more specific
          );
          return !hasMoreSpecificChild;
        });
        
        console.log(`🔧 After deduplication: ${deduplicated.length} topics`);
        
        // Step 2: Boost more specific topics (prefer Level 4 over Level 3)
        const ranked = deduplicated.map((result: TopicSearchResult) => {
          // Extract topic name from full_path (last element)
          const topicName = result.full_path && result.full_path.length > 0
            ? result.full_path[result.full_path.length - 1]
            : 'Unknown Topic';
          
          return {
            ...result,
            topic_name: topicName, // Add missing topic_name
            adjustedSimilarity: result.similarity - (result.topic_level * 0.02),
            isSpecific: result.topic_level >= 4,
          };
        }).sort((a: any, b: any) => a.adjustedSimilarity - b.adjustedSimilarity);
        
        console.log(`🎯 After ranking: ${ranked.length} topics (specific topics boosted)`);
        
        setSearchResults(ranked as TopicSearchResult[]);
          return;
        } catch (e) {
          lastError = e;
          continue;
        }
      }

      console.warn('❌ Search failed across all HTTP endpoints:', lastError);

      // Fallback: Supabase Edge Function (already exists in this repo: supabase/functions/search-topics)
      // This avoids depending on fl4sh.cards / Vercel when those endpoints are down.
      try {
        console.log('🛟 Falling back to Supabase Edge Function: search-topics');
        const { data: fnData, error: fnError } = await supabase.functions.invoke('search-topics', {
          body: searchParams,
        });

        if (fnError) {
          throw fnError;
        }

        const fnResults = (fnData?.results || []) as any[];
        const mapped: TopicSearchResult[] = fnResults.map((r: any) => {
          const confidence = typeof r.confidence === 'number' ? r.confidence : 0;
          // Existing UI expects "similarity" where lower = better, and uses (1 - similarity) as match%.
          // Map confidence -> similarity in that same convention.
          const similarity = 1 - Math.max(0, Math.min(1, confidence));

          return {
            topic_id: r.id || r.topic_id,
            topic_name: r.topic_name || 'Unknown Topic',
            plain_english_summary: r.plain_english_summary || '',
            difficulty_band: r.difficulty_band || '',
            exam_importance: typeof r.exam_importance === 'number' ? r.exam_importance : 0,
            full_path: Array.isArray(r.full_path) ? r.full_path : [],
            similarity,
            subject_name: r.subject_name || subjectName || '',
            exam_board: examBoard || '',
            qualification_level: qualificationLevel,
            topic_level: typeof r.topic_level === 'number' ? r.topic_level : 0,
          };
        });

        console.log(`✅ Edge Function search returned ${mapped.length} results`);
        setSearchResults(mapped);
        return;
      } catch (fnErr) {
        console.warn('❌ Edge Function fallback failed:', fnErr);
        Alert.alert(
          'Search Error',
          'Topic search is temporarily unavailable. Please try again, or use Browse Curriculum.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.warn('❌ Search error:', error);
      Alert.alert('Search Error', 'Failed to search topics. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTopic = (topic: TopicSearchResult) => {
    setSelectedTopic(topic);
    console.log('🎯 Selected topic:', {
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      subjectName,
      examBoard,
      examType
    });
    
    // Navigate to card creation choice
    (navigation.navigate as any)('CardCreationChoice', {
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      subjectName: subjectName,
      examBoard: examBoard,
      examType: examType,
      // Pass discovery metadata
      discoveryMethod: 'search',
      searchQuery: searchQuery,
      subjectId: subjectId,
    });
  };

  const handleBrowseAll = () => {
    // Navigate to full hierarchy browser
    (navigation.navigate as any)('CardTopicSelector', {
      subjectId,
      subjectName,
      examBoard,
      examType,
      mode: 'browse',
    });
  };

  const handleRecentTopicPress = (topic: RecentTopic) => {
    // Navigate to card creation for this topic
    (navigation.navigate as any)('CardCreationChoice', {
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      subjectName,
      examBoard,
      examType,
      discoveryMethod: 'recent',
      subjectId: subjectId,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'core':
      case 'foundation':
        return '#00F5FF';
      case 'standard':
      case 'intermediate':
        return '#FF006E';
      case 'challenge':
      case 'advanced':
        return '#FFD700';
      default:
        return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          {Platform.OS === 'web' ? (
            <Text style={{ fontSize: 24, color: '#FFF' }}>←</Text>
          ) : (
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          )}
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Discover Topics</Text>
          <Text style={styles.headerSubtitle}>{subjectName}</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'search' && styles.modeButtonActive]}
            onPress={() => setMode('search')}
          >
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 20 }}>🔍</Text>
            ) : (
              <Ionicons name="search" size={20} color={mode === 'search' ? '#FFF' : '#666'} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'browse' && styles.modeButtonActive]}
            onPress={handleBrowseAll}
          >
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 20 }}>📁</Text>
            ) : (
              <Ionicons name="list" size={20} color={mode === 'browse' ? '#FFF' : '#666'} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'search' ? (
        <ScrollView style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 20, marginRight: 10 }}>🔍</Text>
            ) : (
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            )}
            <TextInput
              style={styles.searchInput}
              placeholder="What are you studying today?"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 20, color: '#FF006E' }}>✕</Text>
                ) : (
                  <Ionicons name="close-circle" size={20} color="#FF006E" />
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <FeedbackPill
              label="Not found the topic you need?"
              hint="Tell us what’s missing/incorrect and we’ll improve the curriculum."
              category="topics"
              contextTitle="Topics feedback"
              contextHint="Topics not found / incorrect / irrelevant"
              subjectId={subjectId}
              extraParams={{
                subjectName,
                examBoard,
                examType,
                searchQuery,
              }}
            />
          </View>

          {/* Smart Suggestions */}
          {searchQuery.length === 0 && (
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>
                💡 Popular topics in {subjectName}:
              </Text>
              {loadingSuggestions ? (
                <View style={styles.suggestionsLoading}>
                  <ActivityIndicator size="small" color="#00F5FF" />
                </View>
              ) : (
                <View style={styles.exampleChips}>
                  {smartSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.exampleChip}
                      onPress={() => handleSearch(suggestion)}
                    >
                      <Text style={styles.exampleText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Recent Topics */}
          {recentTopics.length > 0 && searchQuery.length === 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionTitle}>Recently Studied:</Text>
              {recentTopics.map((topic) => (
                <TouchableOpacity
                  key={topic.topic_id}
                  style={styles.recentTopicCard}
                  onPress={() => handleRecentTopicPress(topic)}
                >
                  <View style={styles.recentTopicContent}>
                    <Text style={styles.recentTopicName}>{getTopicLabel(topic)}</Text>
                    {topic.search_query && (
                      <Text style={styles.recentSearchQuery}>
                        Searched: "{topic.search_query}"
                      </Text>
                    )}
                  </View>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 20 }}>→</Text>
                  ) : (
                    <Ionicons name="arrow-forward" size={20} color="#00F5FF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Search Results */}
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF006E" />
              <Text style={styles.loadingText}>AI is finding relevant topics...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>
                Found {searchResults.length} topics
              </Text>

              {(showAllResults ? searchResults : searchResults.slice(0, 3)).map((result, index) => {
                const isTopResult = index === 0;
                const isSpecific = result.topic_level >= 4;
                const matchScore = Math.round((1 - result.similarity) * 100);
                
                return (
                <TouchableOpacity
                  key={result.topic_id}
                  style={styles.resultCard}
                  onPress={() => handleSelectTopic(result)}
                >
                  {/* Smart Badge */}
                  {isTopResult && (
                    <View style={[
                      styles.bestMatchBadge,
                      { backgroundColor: isSpecific ? '#00F5FF' : '#FFD700' }
                    ]}>
                      <Text style={styles.bestMatchText}>
                        {isSpecific ? '🎯 Most Specific' : '⭐ Best Match'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.resultContent}>
                    {/* Topic Name - PROMINENT (Abbreviated for readability) */}
                    <Text style={styles.resultTitle}>{sanitizeTopicLabel(result.topic_name)}</Text>

                    {/* Breadcrumb Path - SHOW CONTEXT */}
                    {result.full_path && result.full_path.length > 1 && (
                      <View style={styles.breadcrumbContainer}>
                        <Text style={styles.breadcrumbLabel}>Location: </Text>
                        {result.full_path.slice(0, -1).map((crumb, idx) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <Text style={styles.breadcrumbSeparator}> › </Text>}
                            <Text style={styles.breadcrumbText} numberOfLines={1}>
                              {crumb}
                            </Text>
                          </React.Fragment>
                        ))}
                      </View>
                    )}

                    {/* Level indicator */}
                    <Text style={styles.topicLevelText}>
                      Level {result.topic_level} Topic
                    </Text>

                    {/* AI Summary - SHORTER */}
                    {result.plain_english_summary && (
                      <>
                        <Text style={styles.resultSummary} numberOfLines={3}>
                          {result.plain_english_summary}
                        </Text>
                        <TouchableOpacity
                          style={styles.readMoreButton}
                          onPress={() => openDetails(result)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.readMoreText}>Read full summary</Text>
                          <Ionicons name="chevron-forward" size={14} color="#00F5FF" />
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Metadata Row */}
                    <View style={styles.metadataRow}>
                      {/* Difficulty Badge */}
                      {result.difficulty_band && (
                        <View
                          style={[
                            styles.difficultyBadge,
                            {
                              backgroundColor:
                                getDifficultyColor(result.difficulty_band) + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.difficultyText,
                              { color: getDifficultyColor(result.difficulty_band) },
                            ]}
                          >
                            {result.difficulty_band}
                          </Text>
                        </View>
                      )}

                      {/* Exam Importance */}
                      {result.exam_importance > 0 && (
                        <View style={styles.importanceContainer}>
                          <Text style={styles.importanceText}>
                            ⭐ {Math.round(result.exam_importance * 100)}%
                          </Text>
                        </View>
                      )}
                      
                      {/* Relevance Score */}
                      <View style={styles.relevanceContainer}>
                        <Text style={styles.relevanceText}>
                          {Math.round((1 - result.similarity) * 100)}% match
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Create Button */}
                  <View style={styles.createButtonContainer}>
                    <TouchableOpacity
                      style={styles.createButtonTouchable}
                      onPress={() => handleSelectTopic(result)}
                    >
                      <LinearGradient
                        colors={['#FF006E', '#00F5FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.createButton}
                      >
                        <Text style={styles.createButtonText}>+</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
              })}
              
              {/* Show More Button */}
              {!showAllResults && searchResults.length > 3 && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => setShowAllResults(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show {searchResults.length - 3} More Results
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#00F5FF" />
                </TouchableOpacity>
              )}
              
              {showAllResults && searchResults.length > 3 && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => setShowAllResults(false)}
                >
                  <Text style={styles.showMoreText}>Show Less</Text>
                  <Ionicons name="chevron-up" size={20} color="#00F5FF" />
                </TouchableOpacity>
              )}
            </View>
          ) : searchQuery.length > 2 ? (
            <View style={styles.emptyState}>
              {Platform.OS === 'web' ? (
                <Text style={{ fontSize: 64 }}>🔍</Text>
              ) : (
                <Ionicons name="search-outline" size={64} color="#666" />
              )}
              <Text style={styles.emptyStateText}>No topics found</Text>
              <Text style={styles.emptyStateSubtext}>Try different keywords</Text>
              
              <TouchableOpacity style={styles.browseButton} onPress={handleBrowseAll}>
                <Text style={styles.browseButtonText}>Browse All Topics Instead</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Browse All Button (always visible) */}
          {searchQuery.length === 0 && (
            <View style={styles.browseSection}>
              <TouchableOpacity style={styles.browseCTA} onPress={handleBrowseAll}>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 28 }}>📚</Text>
                ) : (
                  <Ionicons name="library-outline" size={28} color="#00F5FF" />
                )}
                <View style={styles.browseCTAContent}>
                  <Text style={styles.browseCTATitle}>Browse Full Curriculum</Text>
                  <Text style={styles.browseCTASubtext}>
                    Explore all topics in hierarchical structure
                  </Text>
                </View>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 24 }}>→</Text>
                ) : (
                  <Ionicons name="arrow-forward" size={24} color="#00F5FF" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* Full details modal (view full summary/path without selecting the topic) */}
      <Modal
        visible={!!detailsTopic}
        animationType="slide"
        transparent
        onRequestClose={closeDetails}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Topic details</Text>
                <Text style={styles.modalSubtitle}>{subjectName}</Text>
              </View>
              <TouchableOpacity onPress={closeDetails} style={styles.modalCloseButton}>
                <Ionicons name="close" size={22} color="#E2E8F0" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={styles.modalTopicTitle}>
                {sanitizeTopicLabel(detailsTopic?.topic_name || '', { maxLength: 240 })}
              </Text>

              {detailsTopic?.full_path && detailsTopic.full_path.length > 1 ? (
                <Text style={styles.modalLocation}>
                  Location: {detailsTopic.full_path.slice(0, -1).join(' › ')}
                </Text>
              ) : null}

              <View style={styles.modalMetaRow}>
                <Text style={styles.modalMetaPill}>Level {detailsTopic?.topic_level ?? 0}</Text>
                {detailsTopic?.difficulty_band ? (
                  <Text style={styles.modalMetaPill}>{detailsTopic.difficulty_band}</Text>
                ) : null}
                {typeof detailsTopic?.exam_importance === 'number' ? (
                  <Text style={styles.modalMetaPill}>⭐ {Math.round(detailsTopic.exam_importance * 100)}%</Text>
                ) : null}
                {typeof detailsTopic?.similarity === 'number' ? (
                  <Text style={styles.modalMetaPill}>
                    {Math.round((1 - detailsTopic.similarity) * 100)}% match
                  </Text>
                ) : null}
              </View>

              {detailsTopic?.plain_english_summary ? (
                <>
                  <Text style={styles.modalSectionTitle}>Summary</Text>
                  <Text style={styles.modalSummary}>{detailsTopic.plain_english_summary}</Text>
                </>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={() => {
                  if (!detailsTopic) return;
                  const t = detailsTopic;
                  closeDetails();
                  handleSelectTopic(t);
                }}
              >
                <LinearGradient
                  colors={['#FF006E', '#00F5FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalAddButtonInner}
                >
                  <Text style={styles.modalAddButtonText}>Add this topic</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 5,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    padding: 8,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#FF006E',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    margin: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  examplesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  exampleText: {
    color: '#AAA',
    fontSize: 14,
  },
  suggestionsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 12,
  },
  recentTopicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  recentTopicContent: {
    flex: 1,
  },
  recentTopicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  recentSearchQuery: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    color: '#666',
    marginTop: 15,
    fontSize: 14,
  },
  resultsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    position: 'relative',
  },
  bestMatchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  bestMatchText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  resultContent: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    paddingRight: 100, // Space for best match badge
  },
  breadcrumbLabel: {
    fontSize: 12,
    color: '#00F5FF',
    fontWeight: '600',
  },
  topicLevelText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  resultSummary: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 8,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 2,
  },
  readMoreText: {
    color: '#00F5FF',
    fontSize: 12,
    fontWeight: '700',
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    padding: 6,
    borderRadius: 6,
  },
  breadcrumbText: {
    fontSize: 11,
    color: '#AAA',
  },
  breadcrumbSeparator: {
    fontSize: 11,
    color: '#666',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    maxHeight: '82%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 6,
  },
  modalBody: {
    paddingHorizontal: 16,
  },
  modalBodyContent: {
    paddingTop: 14,
    paddingBottom: 16,
  },
  modalTopicTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalLocation: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 10,
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modalMetaPill: {
    color: '#E2E8F0',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  modalSectionTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  modalSummary: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  modalFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  modalAddButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalAddButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalAddButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  importanceText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '600',
  },
  relevanceContainer: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  relevanceText: {
    fontSize: 11,
    color: '#00F5FF',
    fontWeight: '600',
  },
  createButtonContainer: {
    marginTop: 8,
  },
  createButtonTouchable: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#00F5FF',
  },
  browseButtonText: {
    color: '#00F5FF',
    fontSize: 14,
    fontWeight: '600',
  },
  browseSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  browseCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  browseCTAContent: {
    flex: 1,
    marginLeft: 16,
  },
  browseCTATitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  browseCTASubtext: {
    fontSize: 14,
    color: '#666',
  },
  showMoreButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.3)',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00F5FF',
    marginRight: 8,
  },
});
