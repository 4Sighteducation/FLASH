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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';

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
  }, []);

  const fetchRecentTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('user_discovered_topics')
        .select(`
          topic_id,
          search_query,
          discovered_at,
          topic:curriculum_topics(topic_name)
        `)
        .eq('user_id', user?.id)
        .eq('subject_id', subjectId)
        .order('discovered_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        topic_id: item.topic_id,
        topic_name: item.topic?.topic_name || 'Unknown',
        search_query: item.search_query || '',
        discovered_at: item.discovered_at,
      }));

      setRecentTopics(formatted);
    } catch (error) {
      console.error('Error fetching recent topics:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);
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
      
      // Generate embedding and search using your vector search API
      const response = await fetch('https://www.fl4sh.cards/api/search-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });
      
      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      console.log('📊 Search results:', data);
      
      if (data.success) {
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
        const ranked = deduplicated.map((result: TopicSearchResult) => ({
          ...result,
          adjustedSimilarity: result.similarity - (result.topic_level * 0.02), // Lower = better, so subtract
          isSpecific: result.topic_level >= 4,
        })).sort((a: any, b: any) => a.adjustedSimilarity - b.adjustedSimilarity);
        
        console.log(`🎯 After ranking: ${ranked.length} topics (specific topics boosted)`);
        
        setSearchResults(ranked as TopicSearchResult[]);
      } else {
        console.error('❌ Search failed:', data.message);
        Alert.alert('Search Failed', data.message || 'No results found');
      }
    } catch (error) {
      console.error('❌ Search error:', error);
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
    navigation.navigate('CardCreationChoice' as never, {
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      subjectName: subjectName,
      examBoard: examBoard,
      examType: examType,
      // Pass discovery metadata
      discoveryMethod: 'search',
      searchQuery: searchQuery,
      subjectId: subjectId,
    } as never);
  };

  const handleBrowseAll = () => {
    // Navigate to full hierarchy browser
    navigation.navigate('CardTopicSelector' as never, {
      subjectId,
      subjectName,
      examBoard,
      examType,
      mode: 'browse',
    } as never);
  };

  const handleRecentTopicPress = (topic: RecentTopic) => {
    // Navigate to card creation for this topic
    navigation.navigate('CardCreationChoice' as never, {
      topicId: topic.topic_id,
      topicName: topic.topic_name,
      subjectName,
      examBoard,
      examType,
      discoveryMethod: 'recent',
      subjectId: subjectId,
    } as never);
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

          {/* Helpful Examples */}
          {searchQuery.length === 0 && (
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>Try searching for:</Text>
              <View style={styles.exampleChips}>
                {['photosynthesis', 'atoms', 'world war 2', 'quadratic equations'].map((example) => (
                  <TouchableOpacity
                    key={example}
                    style={styles.exampleChip}
                    onPress={() => handleSearch(example)}
                  >
                    <Text style={styles.exampleText}>{example}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                    <Text style={styles.recentTopicName}>{topic.topic_name}</Text>
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
                Found {searchResults.length} topics (showing top {Math.min(3, searchResults.length)})
              </Text>

              {searchResults.slice(0, 3).map((result, index) => (
                <TouchableOpacity
                  key={result.topic_id}
                  style={styles.resultCard}
                  onPress={() => handleSelectTopic(result)}
                >
                  {/* Best Match Badge */}
                  {index === 0 && (
                    <View style={styles.bestMatchBadge}>
                      <Text style={styles.bestMatchText}>🎯 Best Match</Text>
                    </View>
                  )}

                  <View style={styles.resultContent}>
                    {/* Topic Name - PROMINENT */}
                    <Text style={styles.resultTitle}>{result.topic_name}</Text>

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
                      <Text style={styles.resultSummary} numberOfLines={3}>
                        {result.plain_english_summary}
                      </Text>
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
              ))}
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
});
