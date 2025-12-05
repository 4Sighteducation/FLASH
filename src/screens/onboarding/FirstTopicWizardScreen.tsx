import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';

interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  examBoard: string;
}

interface TopicSearchResult {
  topic_id: string;
  topic_name: string;
  plain_english_summary: string;
  difficulty_band: string;
  exam_importance: number;
  full_path: string[];
  subject_name: string;
  similarity: number;
}

export default function FirstTopicWizardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { subjects, examType } = route.params as {
    subjects: SelectedSubject[];
    examType: string;
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TopicSearchResult[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<SelectedSubject>(subjects[0]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchDebounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Format subject name for search (must include qualification)
        const qualificationMap: Record<string, string> = {
          gcse: 'GCSE',
          alevel: 'A-Level',
          igcse: 'International GCSE',
          btec: 'BTEC',
          ib: 'IB',
        };
        const qualLevel = qualificationMap[examType] || examType;
        const formattedSubjectName = currentSubject.subjectName.includes('(')
          ? currentSubject.subjectName
          : `${currentSubject.subjectName} (${qualLevel})`;

        // Call backend API endpoint for search
        const response = await fetch('https://flash-mw9kep9bm-tony-dennis-projects.vercel.app/api/search-topics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            examBoard: currentSubject.examBoard,
            qualificationLevel: examType.toUpperCase(),
            subjectName: formattedSubjectName,
            limit: 10,
          }),
        });

        if (!response.ok) {
          throw new Error('Search request failed');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Search failed');
        }

        setSearchResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const toggleTopicSelection = (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter(id => id !== topicId));
    } else {
      setSelectedTopics([...selectedTopics, topicId]);
    }
  };

  const handleContinue = () => {
    if (currentStep === 0) {
      // Move to search step
      setCurrentStep(1);
    } else if (currentStep === 1 && selectedTopics.length > 0) {
      // Can optionally add more topics
      setCurrentStep(2);
    } else if (currentStep === 2 || (currentStep === 1 && selectedTopics.length === 0)) {
      // Complete onboarding
      navigation.navigate('OnboardingComplete' as never);
    }
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingComplete' as never);
  };

  const renderStep0 = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.stepIcon}>🎯</Text>
      <Text style={styles.stepTitle}>Let's Add Your First Topic!</Text>
      <Text style={styles.stepSubtitle}>What are you studying right now?</Text>
      <Text style={styles.stepDescription}>
        Type in any topic from your {currentSubject.subjectName} course. 
        For example: "photosynthesis", "world war 2", or "quadratic equations"
      </Text>

      <View style={styles.examplesContainer}>
        <Text style={styles.examplesTitle}>Example topics:</Text>
        {[
          'Circulatory System',
          'Cell Structure',
          'Photosynthesis',
        ].map((example, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.exampleChip}
            onPress={() => handleSearch(example)}
          >
            <Text style={styles.exampleText}>{example}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setCurrentStep(1)}>
        <Text style={styles.primaryButtonText}>Start Searching →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${currentSubject.subjectName} topics...`}
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#FF006E" />
          </TouchableOpacity>
        )}
      </View>

      {/* Subject Tabs (if multiple subjects) */}
      {subjects.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subjectTabsContainer}
          contentContainerStyle={styles.subjectTabsContent}
        >
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.subjectId}
              style={[
                styles.subjectTab,
                currentSubject.subjectId === subject.subjectId && styles.subjectTabActive,
              ]}
              onPress={() => {
                setCurrentSubject(subject);
                if (searchQuery) {
                  handleSearch(searchQuery);
                }
              }}
            >
              <Text
                style={[
                  styles.subjectTabText,
                  currentSubject.subjectId === subject.subjectId && styles.subjectTabTextActive,
                ]}
              >
                {subject.subjectName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Search Results */}
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF006E" />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <>
            <Text style={styles.resultsHeader}>
              Found {searchResults.length} topics
            </Text>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.topic_id}
                style={[
                  styles.resultCard,
                  selectedTopics.includes(result.topic_id) && styles.resultCardSelected,
                ]}
                onPress={() => toggleTopicSelection(result.topic_id)}
              >
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.topic_name}</Text>
                  <Text style={styles.resultSummary}>{result.plain_english_summary}</Text>

                  {/* Breadcrumb */}
                  {result.full_path && result.full_path.length > 0 && (
                    <View style={styles.breadcrumbContainer}>
                      {result.full_path.slice(0, -1).map((crumb, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <Text style={styles.breadcrumbSeparator}> › </Text>}
                          <Text style={styles.breadcrumbText}>{crumb}</Text>
                        </React.Fragment>
                      ))}
                    </View>
                  )}

                  {/* Exam Importance */}
                  {result.exam_importance && (
                    <View style={styles.importanceContainer}>
                      <View
                        style={[
                          styles.importanceBar,
                          { width: `${result.exam_importance * 100}%` },
                        ]}
                      />
                      <Text style={styles.importanceText}>
                        {Math.round(result.exam_importance * 100)}% exam importance
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.selectionIndicator}>
                  <Ionicons
                    name={selectedTopics.includes(result.topic_id) ? 'checkbox' : 'square-outline'}
                    size={28}
                    color={selectedTopics.includes(result.topic_id) ? '#00F5FF' : '#666'}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : searchQuery.length > 2 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#666" />
            <Text style={styles.emptyStateText}>No topics found</Text>
            <Text style={styles.emptyStateSubtext}>Try different keywords</Text>
          </View>
        ) : (
          <View style={styles.promptState}>
            <Ionicons name="search" size={64} color="#333" />
            <Text style={styles.promptText}>
              Type to search for topics in {currentSubject.subjectName}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      {selectedTopics.length > 0 && (
        <LinearGradient
          colors={['#FF006E', '#00F5FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomBar}
        >
          <TouchableOpacity style={styles.bottomBarButton} onPress={handleContinue}>
            <Text style={styles.bottomBarText}>
              Continue with {selectedTopics.length} topic{selectedTopics.length > 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <Text style={styles.stepIcon}>✨</Text>
      <Text style={styles.stepTitle}>Great Start!</Text>
      <Text style={styles.stepSubtitle}>
        You've added {selectedTopics.length} topic{selectedTopics.length > 1 ? 's' : ''}
      </Text>
      <Text style={styles.stepDescription}>
        Want to add a few more topics now, or start creating flashcards?
      </Text>

      <View style={styles.choiceContainer}>
        <TouchableOpacity
          style={[styles.choiceButton, styles.choiceButtonPrimary]}
          onPress={() => setCurrentStep(1)}
        >
          <Ionicons name="add-circle-outline" size={32} color="#00F5FF" />
          <Text style={styles.choiceButtonTitle}>Add More Topics</Text>
          <Text style={styles.choiceButtonSubtext}>Search for more content</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.choiceButton, styles.choiceButtonSecondary]}
          onPress={handleContinue}
        >
          <Ionicons name="flash-outline" size={32} color="#FF006E" />
          <Text style={styles.choiceButtonTitle}>Start Creating Cards</Text>
          <Text style={styles.choiceButtonSubtext}>Begin your study journey</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {currentStep === 0 && renderStep0()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
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
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#FF006E',
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#00F5FF',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 16,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  examplesContainer: {
    marginBottom: 32,
  },
  examplesTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  exampleChip: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  exampleText: {
    color: '#AAA',
    fontSize: 14,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF006E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 16,
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
  subjectTabsContainer: {
    marginBottom: 16,
  },
  subjectTabsContent: {
    gap: 8,
  },
  subjectTab: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  subjectTabActive: {
    backgroundColor: '#FF006E',
    borderColor: '#FF006E',
  },
  subjectTabText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectTabTextActive: {
    color: '#FFF',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    paddingBottom: 100,
  },
  resultsHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  resultCardSelected: {
    borderColor: '#00F5FF',
    backgroundColor: '#001A1A',
  },
  resultContent: {
    flex: 1,
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  resultSummary: {
    fontSize: 14,
    color: '#AAA',
    lineHeight: 20,
    marginBottom: 8,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#666',
  },
  breadcrumbSeparator: {
    fontSize: 12,
    color: '#444',
  },
  importanceContainer: {
    marginTop: 4,
  },
  importanceBar: {
    height: 4,
    backgroundColor: '#FF006E',
    borderRadius: 2,
    marginBottom: 4,
  },
  importanceText: {
    fontSize: 11,
    color: '#666',
  },
  selectionIndicator: {
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingTop: 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    marginTop: 16,
    fontSize: 14,
  },
  emptyState: {
    paddingTop: 50,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  promptState: {
    paddingTop: 50,
    alignItems: 'center',
  },
  promptText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bottomBarButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomBarText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  choiceContainer: {
    gap: 16,
  },
  choiceButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  choiceButtonPrimary: {
    borderColor: '#00F5FF',
  },
  choiceButtonSecondary: {
    borderColor: '#FF006E',
  },
  choiceButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 12,
    marginBottom: 8,
  },
  choiceButtonSubtext: {
    fontSize: 14,
    color: '#AAA',
  },
});









