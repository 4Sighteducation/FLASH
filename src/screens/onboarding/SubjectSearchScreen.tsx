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
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SubjectOption {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  exam_board_code: string;
  exam_board_name: string;
  topic_count: number;
}

interface GroupedSubject {
  subject_name: string;
  qualification_level: string;
  exam_board_options: SubjectOption[];
}

interface SelectedSubject {
  subject_id: string;
  subject_name: string;
  exam_board_code: string;
  exam_board_name: string;
}

export default function SubjectSearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { examType } = route.params as { examType: string };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GroupedSubject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const searchDebounceRef = useRef<NodeJS.Timeout>();

  // Map exam type display names to database codes
  const examTypeToCode: { [key: string]: string } = {
    gcse: 'GCSE',
    alevel: 'A_LEVEL',
    aslevel: 'AS_LEVEL',
    btec: 'BTEC',
    ib: 'IB',
    igcse: 'IGCSE',
  };

  // Subject abbreviation/synonym mapping
  const subjectSynonyms: { [key: string]: string } = {
    // PE variations
    'pe': 'Physical Education',
    'phys ed': 'Physical Education',
    'p.e': 'Physical Education',
    'p.e.': 'Physical Education',
    
    // Science subjects
    'bio': 'Biology',
    'chem': 'Chemistry',
    'phys': 'Physics',
    'sci': 'Science',
    
    // Maths variations
    'maths': 'Mathematics',
    'math': 'Mathematics',
    
    // Computer Science
    'cs': 'Computer Science',
    'comp sci': 'Computer Science',
    'computing': 'Computer Science',
    
    // Languages
    'eng': 'English',
    'eng lit': 'English Literature',
    'eng lang': 'English Language',
    'fr': 'French',
    'ger': 'German',
    'span': 'Spanish',
    
    // Humanities
    'hist': 'History',
    'geo': 'Geography',
    'psych': 'Psychology',
    'socio': 'Sociology',
    're': 'Religious Studies',
    'rs': 'Religious Studies',
    
    // Business/Economics
    'bus': 'Business',
    'econ': 'Economics',
    'acc': 'Accounting',
    'acct': 'Accounting',
    
    // Arts
    'art': 'Art and Design',
    'dt': 'Design and Technology',
    'd&t': 'Design and Technology',
    'music': 'Music',
    'drama': 'Drama',
    'pe': 'Physical Education',
    
    // Other
    'it': 'Information Technology',
    'ict': 'Information Technology',
    'food tech': 'Food Technology',
  };

  // Don't auto-search on mount - let user type their subject
  // This was causing wrong qualification level to show

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
      // Expand abbreviations/synonyms
      const lowercaseQuery = query.toLowerCase().trim();
      const expandedQuery = subjectSynonyms[lowercaseQuery] || query;
      
      if (expandedQuery !== query) {
        console.log(`🔄 Expanded "${query}" → "${expandedQuery}"`);
      }
      
      await performSearch(expandedQuery);
    }, 300);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);

    try {
      const qualificationCode = examTypeToCode[examType] || examType;

      // Query database for subjects matching search term
      const { data, error } = await supabase.rpc('search_subjects_with_boards', {
        p_search_term: query,
        p_qualification_code: qualificationCode,
      });

      if (error) {
        console.error('Search error:', error);
        // Fallback to direct query if RPC doesn't exist
        await performDirectSearch(query, qualificationCode);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search subjects');
    } finally {
      setIsSearching(false);
    }
  };

  const performDirectSearch = async (query: string, qualificationCode: string) => {
    try {
      // Direct SQL query fallback
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('exam_board_subjects')
        .select(`
          id,
          subject_name,
          subject_code,
          exam_boards!inner(code, full_name),
          qualification_types!inner(code)
        `)
        .ilike('subject_name', `%${query}%`)
        .eq('qualification_types.code', qualificationCode)
        .eq('is_current', true);

      if (subjectsError) throw subjectsError;

      // Group by subject name
      const grouped: { [key: string]: GroupedSubject } = {};

      (subjectsData || []).forEach((subject: any) => {
        const key = subject.subject_name;
        if (!grouped[key]) {
          grouped[key] = {
            subject_name: subject.subject_name,
            qualification_level: qualificationCode,
            exam_board_options: [],
          };
        }

        grouped[key].exam_board_options.push({
          subject_id: subject.id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          exam_board_code: subject.exam_boards.code,
          exam_board_name: subject.exam_boards.full_name,
          topic_count: 0, // We'll update this later if needed
        });
      });

      setSearchResults(Object.values(grouped));
    } catch (error) {
      console.error('Direct search error:', error);
      Alert.alert('Error', 'Failed to search subjects');
    } finally {
      setIsSearching(false);
    }
  };

  const toggleSubjectExpansion = (subjectName: string) => {
    setExpandedSubjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subjectName)) {
        newSet.delete(subjectName);
      } else {
        newSet.add(subjectName);
      }
      return newSet;
    });
  };

  const selectSubject = (option: SubjectOption) => {
    const alreadySelected = selectedSubjects.some(
      (s) => s.subject_id === option.subject_id
    );

    if (alreadySelected) {
      // Remove if already selected
      setSelectedSubjects(
        selectedSubjects.filter((s) => s.subject_id !== option.subject_id)
      );
    } else {
      // Add to selections
      setSelectedSubjects([
        ...selectedSubjects,
        {
          subject_id: option.subject_id,
          subject_name: option.subject_name,
          exam_board_code: option.exam_board_code,
          exam_board_name: option.exam_board_name,
        },
      ]);
    }
  };

  const removeSelectedSubject = (subjectId: string) => {
    setSelectedSubjects(selectedSubjects.filter((s) => s.subject_id !== subjectId));
  };

  const handleContinue = async () => {
    if (selectedSubjects.length === 0) {
      Alert.alert('Select a Subject', 'Please select at least one subject to continue');
      return;
    }

    setIsSaving(true);

    try {
      console.log('💾 Saving subjects...', selectedSubjects);
      
      // Save all selected subjects to database
      const subjectsToInsert = selectedSubjects.map((s) => ({
        user_id: user?.id,
        subject_id: s.subject_id,
        exam_board: s.exam_board_code,
      }));

      console.log('📝 Inserting to user_subjects:', subjectsToInsert);

      const { data: insertData, error: subjectsError } = await supabase
        .from('user_subjects')
        .upsert(subjectsToInsert, {
          onConflict: 'user_id,subject_id',
        });

      if (subjectsError) {
        console.error('❌ Subjects insert error:', subjectsError);
        throw subjectsError;
      }

      console.log('✅ Subjects saved successfully!');

      // Update user's exam type
      console.log('📝 Updating user exam_type to:', examType);
      
      const { error: userError } = await supabase
        .from('users')
        .update({ exam_type: examType })
        .eq('id', user?.id);

      if (userError) {
        console.error('❌ User update error:', userError);
        throw userError;
      }

      console.log('✅ User exam_type updated!');
      console.log('🚀 Navigating to OnboardingComplete...');

      // Navigate to onboarding complete
      navigation.navigate('OnboardingComplete' as never);
    } catch (error) {
      console.error('❌ Error saving subjects:', error);
      Alert.alert('Error', 'Failed to save your subjects. Please try again.');
      setIsSaving(false);
    }
  };

  const isSubjectSelected = (subjectId: string) => {
    return selectedSubjects.some((s) => s.subject_id === subjectId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Select Your Subjects</Text>
            <Text style={styles.headerSubtitle}>
              Search and choose which subjects you're studying
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 20, marginRight: 10 }}>🔍</Text>
            ) : (
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
            )}
            <TextInput
              style={styles.searchInput}
              placeholder="Type a subject name... (e.g., Physics, Biology)"
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 20 }}>✕</Text>
                ) : (
                  <Ionicons name="close-circle" size={20} color="#FF006E" />
                )}
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.searchHint}>
            💡 Not sure which exam board? No problem! We'll show you all options.
          </Text>
        </View>

        {/* Selected Subjects Summary */}
        {selectedSubjects.length > 0 && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>
              Selected ({selectedSubjects.length})
            </Text>
            {selectedSubjects.map((subject) => (
              <View key={subject.subject_id} style={styles.selectedChip}>
                <View style={styles.selectedChipContent}>
                  <Text style={styles.selectedChipText}>
                    {subject.subject_name}
                  </Text>
                  <Text style={styles.selectedChipExamBoard}>
                    {subject.exam_board_name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeSelectedSubject(subject.subject_id)}
                  style={styles.removeButton}
                >
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 20, color: '#FF006E' }}>✕</Text>
                  ) : (
                    <Ionicons name="close-circle" size={20} color="#FF006E" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Search Results */}
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00F5FF" />
            <Text style={styles.loadingText}>Searching subjects...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader}>
              Found {searchResults.length} subject{searchResults.length > 1 ? 's' : ''}
            </Text>

            {searchResults.map((result) => (
              <View key={result.subject_name} style={styles.subjectGroup}>
                <TouchableOpacity
                  style={styles.subjectGroupHeader}
                  onPress={() => toggleSubjectExpansion(result.subject_name)}
                >
                  <View style={styles.subjectGroupHeaderContent}>
                    <Text style={styles.subjectGroupTitle}>
                      {result.subject_name}
                    </Text>
                    <Text style={styles.subjectGroupSubtitle}>
                      {result.exam_board_options.length} exam board
                      {result.exam_board_options.length > 1 ? 's' : ''} available
                    </Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 24, color: '#00F5FF' }}>
                      {expandedSubjects.has(result.subject_name) ? '▼' : '▶'}
                    </Text>
                  ) : (
                    <Ionicons
                      name={
                        expandedSubjects.has(result.subject_name)
                          ? 'chevron-down'
                          : 'chevron-forward'
                      }
                      size={24}
                      color="#00F5FF"
                    />
                  )}
                </TouchableOpacity>

                {expandedSubjects.has(result.subject_name) && (
                  <View style={styles.examBoardList}>
                    {result.exam_board_options.map((option) => {
                      const selected = isSubjectSelected(option.subject_id);
                      return (
                        <TouchableOpacity
                          key={option.subject_id}
                          style={[
                            styles.examBoardOption,
                            selected && styles.examBoardOptionSelected,
                          ]}
                          onPress={() => selectSubject(option)}
                        >
                          <View style={styles.examBoardContent}>
                            <Text style={styles.examBoardCode}>
                              {option.exam_board_code}
                            </Text>
                            <Text style={styles.examBoardName}>
                              {option.exam_board_name}
                            </Text>
                          </View>
                          {Platform.OS === 'web' ? (
                            <Text style={{ fontSize: 28 }}>
                              {selected ? '✅' : '➕'}
                            </Text>
                          ) : (
                            <Ionicons
                              name={
                                selected ? 'checkmark-circle' : 'add-circle-outline'
                              }
                              size={28}
                              color={selected ? '#00F5FF' : '#666'}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 64 }}>🔍</Text>
            ) : (
              <Ionicons name="search-outline" size={64} color="#666" />
            )}
            <Text style={styles.emptyStateText}>No subjects found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try searching for: Biology, Physics, Mathematics, History
            </Text>
          </View>
        ) : (
          <View style={styles.promptState}>
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 64 }}>📚</Text>
            ) : (
              <Ionicons name="book-outline" size={64} color="#333" />
            )}
            <Text style={styles.promptText}>
              Start typing to search for your subjects
            </Text>
            <Text style={styles.promptSubtext}>
              Popular: Biology, Chemistry, Physics, Mathematics
            </Text>
          </View>
        )}

        {/* Bottom spacing for button */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Continue Button */}
      {selectedSubjects.length > 0 && (
        <View style={styles.bottomBarContainer}>
          <LinearGradient
            colors={['#FF006E', '#00F5FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bottomBar}
          >
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    Continue with {selectedSubjects.length} subject
                    {selectedSubjects.length > 1 ? 's' : ''} →
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>

          <Text style={styles.reassuranceText}>
            💡 Don't worry, you can add more subjects or change exam boards later
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 5,
    marginBottom: 10,
  },
  headerTextContainer: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#AAA',
    lineHeight: 22,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
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
  searchHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  selectedContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00F5FF',
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#001A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#00F5FF',
  },
  selectedChipContent: {
    flex: 1,
  },
  selectedChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  selectedChipExamBoard: {
    fontSize: 14,
    color: '#00F5FF',
  },
  removeButton: {
    padding: 5,
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
  resultsContainer: {
    paddingHorizontal: 20,
  },
  resultsHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  subjectGroup: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  subjectGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subjectGroupHeaderContent: {
    flex: 1,
  },
  subjectGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  subjectGroupSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  examBoardList: {
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  examBoardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#0A0A0A',
  },
  examBoardOptionSelected: {
    backgroundColor: '#001A1A',
    borderLeftWidth: 4,
    borderLeftColor: '#00F5FF',
  },
  examBoardContent: {
    flex: 1,
  },
  examBoardCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  examBoardName: {
    fontSize: 14,
    color: '#AAA',
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
    textAlign: 'center',
  },
  promptState: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 40,
  },
  promptText: {
    fontSize: 18,
    color: '#AAA',
    marginTop: 20,
    textAlign: 'center',
  },
  promptSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  bottomBar: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  reassuranceText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
