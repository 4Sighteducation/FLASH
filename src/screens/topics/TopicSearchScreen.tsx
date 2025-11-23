import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useTopicSearch } from '../../hooks/useTopicSearch';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TopicSearchResult {
  id: string;
  topic_name: string;
  plain_english_summary: string;
  difficulty_band: 'Foundation' | 'Intermediate' | 'Advanced';
  exam_importance: number;
  full_path: string[];
  confidence: number;
  subject_name: string;
}

export default function TopicSearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  
  // Get params from onboarding flow
  const { examBoard, qualificationLevel, subjectName } = route.params as any;
  
  // Animation values
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  // Hook for AI-powered search
  const { 
    searchResults, 
    isLoading, 
    error, 
    searchTopics 
  } = useTopicSearch({
    examBoard,
    qualificationLevel,
    subjectName,
  });

  // Animate border on focus
  useEffect(() => {
    const animateBorder = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };
    
    if (isSearching) {
      animateBorder();
    }
  }, [isSearching]);

  // Pulse animation for selected items
  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Debounced search
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    if (text.trim().length > 2) {
      searchDebounceRef.current = setTimeout(() => {
        searchTopics(text);
      }, 500);
    }
  }, [searchTopics]);

  const toggleTopicSelection = (topicId: string) => {
    startPulse();
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Foundation': return '#00F5FF';
      case 'Intermediate': return '#FF006E';
      case 'Advanced': return '#FFD700';
      default: return '#666';
    }
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence > 0.8) return 'checkmark-circle';
    if (confidence > 0.6) return 'checkmark-circle-outline';
    return 'help-circle-outline';
  };

  const animatedBorderColor = borderAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FF006E', '#00F5FF', '#FF006E'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Find Topics</Text>
            <Text style={styles.headerSubtitle}>
              {subjectName} • {examBoard} {qualificationLevel}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <Animated.View style={[
          styles.searchContainer,
          {
            borderColor: isSearching ? animatedBorderColor : '#333',
            borderWidth: isSearching ? 2 : 1,
          }
        ]}>
          <View style={styles.searchInputContainer}>
            <Ionicons 
              name="search" 
              size={20} 
              color={isSearching ? '#FF006E' : '#666'} 
              style={styles.searchIcon}
            />
            
            <TextInput
              style={styles.searchInput}
              placeholder="Type what you want to learn..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => setIsSearching(true)}
              onBlur={() => setIsSearching(false)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  searchTopics('');
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#FF006E" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Search hint */}
          {searchQuery.length === 0 && (
            <Text style={styles.searchHint}>
              Try: "photosynthesis", "world war 2", "calculus basics"
            </Text>
          )}
        </Animated.View>

        {/* Results */}
        <ScrollView 
          style={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsContent}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF006E" />
              <Text style={styles.loadingText}>AI is finding relevant topics...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <Text style={styles.resultsHeader}>
                Found {searchResults.length} topics
              </Text>
              
              {searchResults.map((result, index) => (
                <Animated.View
                  key={result.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[
                      styles.resultCard,
                      selectedTopics.includes(result.id) && styles.resultCardSelected,
                    ]}
                    onPress={() => toggleTopicSelection(result.id)}
                    activeOpacity={0.8}
                  >
                    {/* Confidence indicator */}
                    <View style={styles.confidenceBadge}>
                      <Ionicons 
                        name={getConfidenceIcon(result.confidence)} 
                        size={16} 
                        color={result.confidence > 0.8 ? '#00F5FF' : '#FF006E'}
                      />
                      <Text style={styles.confidenceText}>
                        {Math.round(result.confidence * 100)}%
                      </Text>
                    </View>
                    
                    {/* Topic info */}
                    <View style={styles.resultContent}>
                      <View style={styles.resultHeader}>
                        <Text style={styles.resultTitle}>{result.topic_name}</Text>
                        <View 
                          style={[
                            styles.difficultyBadge,
                            { backgroundColor: getDifficultyColor(result.difficulty_band) + '20' }
                          ]}
                        >
                          <Text 
                            style={[
                              styles.difficultyText,
                              { color: getDifficultyColor(result.difficulty_band) }
                            ]}
                          >
                            {result.difficulty_band}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.resultSummary}>
                        {result.plain_english_summary}
                      </Text>
                      
                      {/* Path breadcrumb */}
                      <View style={styles.pathContainer}>
                        {result.full_path.map((path, idx) => (
                          <React.Fragment key={idx}>
                            <Text style={styles.pathText}>{path}</Text>
                            {idx < result.full_path.length - 1 && (
                              <Ionicons 
                                name="chevron-forward" 
                                size={12} 
                                color="#666" 
                                style={styles.pathSeparator}
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </View>
                      
                      {/* Importance indicator */}
                      <View style={styles.importanceContainer}>
                        <Text style={styles.importanceLabel}>Exam importance:</Text>
                        <View style={styles.importanceBar}>
                          <View 
                            style={[
                              styles.importanceFill,
                              { width: `${result.exam_importance * 100}%` }
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    
                    {/* Selection indicator */}
                    <View style={styles.selectionIndicator}>
                      <Ionicons 
                        name={selectedTopics.includes(result.id) ? 'checkbox' : 'square-outline'}
                        size={24} 
                        color={selectedTopics.includes(result.id) ? '#FF006E' : '#666'}
                      />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </>
          ) : searchQuery.length > 2 && !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>No topics found</Text>
              <Text style={styles.emptyStateSubtext}>
                Try different keywords or browse by category
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom action bar */}
        {selectedTopics.length > 0 && (
          <Animated.View 
            style={[
              styles.bottomBar,
              { transform: [{ scale: pulseAnimation }] }
            ]}
          >
            <LinearGradient
              colors={['#FF006E', '#FF1088']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButton}
            >
              <TouchableOpacity
                style={styles.continueButtonInner}
                onPress={() => {
                  // Navigate to card creation with selected topics
                  navigation.navigate('CreateCards', {
                    selectedTopics,
                    examBoard,
                    qualificationLevel,
                    subjectName,
                  });
                }}
              >
                <Text style={styles.continueButtonText}>
                  Create Cards ({selectedTopics.length} topics)
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 5,
  },
  headerTextContainer: {
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
  searchContainer: {
    margin: 20,
    marginBottom: 10,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 15,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  clearButton: {
    padding: 5,
  },
  searchHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    fontStyle: 'italic',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  resultsHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
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
  resultCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  resultCardSelected: {
    borderColor: '#FF006E',
    backgroundColor: '#0F0010',
  },
  confidenceBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#FFF',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  resultContent: {
    flex: 1,
    marginRight: 40,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resultSummary: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 10,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  pathText: {
    fontSize: 12,
    color: '#666',
  },
  pathSeparator: {
    marginHorizontal: 5,
  },
  importanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  importanceLabel: {
    fontSize: 11,
    color: '#666',
    marginRight: 8,
  },
  importanceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1A1A1A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  importanceFill: {
    height: '100%',
    backgroundColor: '#FF006E',
    borderRadius: 2,
  },
  selectionIndicator: {
    justifyContent: 'center',
    paddingLeft: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 15,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 8,
  },
});
