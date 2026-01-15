import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { showUpgradePrompt } from '../../utils/upgradePrompt';

interface ExamBoard {
  id: string;
  code: string;
  full_name: string;
}

interface Subject {
  id: string;
  subject_name: string;
  exam_board_id: string;
}

interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  examBoard: string;
}

// Map exam type display names to database codes
const examTypeToCode: { [key: string]: string } = {
  'gcse': 'GCSE',
  'alevel': 'A_LEVEL',
  'aslevel': 'AS_LEVEL',
  'ialev': 'IA_LEVEL',
  'btec': 'BTEC',
  'ib': 'IB',
  'igcse': 'IGCSE',
  // Also support the display names just in case
  'GCSE': 'GCSE',
  'A-Level': 'A_LEVEL',
  'AS-Level': 'AS_LEVEL',
  'iA-Level': 'IA_LEVEL',
  'BTEC': 'BTEC',
  'IB': 'IB',
  'iGCSE': 'IGCSE'
};

export default function SubjectSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { tier, checkLimits } = useSubscription();
  const { examType, isAddingSubjects } = route.params as { examType: string; isAddingSubjects?: boolean };
  const insets = useSafeAreaInsets();
  
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [selectedExamBoard, setSelectedExamBoard] = useState<ExamBoard | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    fetchExamBoards();
  }, []);

  useEffect(() => {
    if (selectedExamBoard) {
      fetchSubjectsForExamBoard(selectedExamBoard.id);
    }
  }, [selectedExamBoard]);

  useEffect(() => {
    // Filter subjects based on search query
    if (searchQuery.trim() === '') {
      setFilteredSubjects(subjects);
    } else {
      const filtered = subjects.filter(subject =>
        subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSubjects(filtered);
    }
  }, [searchQuery, subjects]);

  const fetchExamBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('id, code, full_name')
        .eq('active', true)
        .order('code');

      if (error) throw error;

      setExamBoards(data || []);
    } catch (error) {
      console.error('Error fetching exam boards:', error);
      Alert.alert('Error', 'Failed to load exam boards');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsForExamBoard = async (examBoardId: string) => {
    try {
      setLoadingSubjects(true);
      setSubjects([]);
      setFilteredSubjects([]);
      
      // Map exam type to database code
      const examTypeCode = examTypeToCode[examType] || examType;
      console.log(`🔍 Fetching subjects for exam type: ${examType} (code: ${examTypeCode})`);
      
      // Get qualification type ID
      const { data: qualTypeData, error: qualTypeError } = await supabase
        .from('qualification_types')
        .select('id')
        .eq('code', examTypeCode)
        .maybeSingle();

      if (qualTypeError) {
        console.error('Error fetching qualification type:', qualTypeError);
        throw qualTypeError;
      }

      if (!qualTypeData) {
        console.error('No qualification type found for:', examTypeCode);
        Alert.alert('Error', `No qualification type found for ${examType}`);
        return;
      }

      // Fetch subjects for this exam board and qualification type
      const { data, error } = await supabase
        .from('exam_board_subjects')
        .select('id, subject_name, exam_board_id')
        .eq('exam_board_id', examBoardId)
        .eq('qualification_type_id', qualTypeData.id)
        .eq('is_current', true)
        .order('subject_name');

      if (error) throw error;

      console.log(`📚 Found ${data?.length || 0} subjects for ${selectedExamBoard?.code}`);
      
      setSubjects(data || []);
      setFilteredSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const toggleSubject = (subject: Subject) => {
    const existingIndex = selectedSubjects.findIndex(s => s.subjectId === subject.id);
    
    if (existingIndex >= 0) {
      setSelectedSubjects(selectedSubjects.filter((_, index) => index !== existingIndex));
      if (selectedSubjects.length === 1) {
        setShowScrollHint(false); // Hide hint if deselecting last subject
      }
    } else {
      // Check subscription limits for Free users
      if (tier === 'free') {
        // Get current active subjects count from database
        const checkAndToggle = async () => {
          const { data: userSubjects, error } = await supabase
            .from('user_subjects')
            .select('id')
            .eq('user_id', user?.id);
          
          const currentSubjectCount = (userSubjects?.length || 0) + selectedSubjects.length;
          
          if (!checkLimits('subject', currentSubjectCount + 1)) {
            showUpgradePrompt({
                message: 'The Free plan is limited to 1 subject. Keep studying like a Pro for unlimited subjects.',
              navigation,
            });
            return;
          }
          
          // If within limits, add the subject
          setSelectedSubjects([...selectedSubjects, {
            subjectId: subject.id,
            subjectName: subject.subject_name,
            examBoard: selectedExamBoard!.code,
          }]);
          // Show scroll hint after first selection
          if (selectedSubjects.length === 0) {
            setShowScrollHint(true);
          }
        };
        
        checkAndToggle();
      } else {
        // Full version - no limits
        setSelectedSubjects([...selectedSubjects, {
          subjectId: subject.id,
          subjectName: subject.subject_name,
          examBoard: selectedExamBoard!.code,
        }]);
        // Show scroll hint after first selection
        if (selectedSubjects.length === 0) {
          setShowScrollHint(true);
        }
      }
    }
  };

  const handleContinue = async () => {
    if (selectedSubjects.length === 0) return;

    try {
      if (!user?.id || !user?.email) {
        throw new Error('Missing user session');
      }

      // Ensure a public.users profile exists (some social logins can lack it if DB trigger isn't installed)
      const { error: ensureError } = await supabase.rpc('ensure_user_profile', {
        p_user_id: user.id,
        p_email: user.email,
        p_username: user.user_metadata?.username ?? null,
      });
      if (ensureError) {
        console.warn('[Onboarding] ensure_user_profile failed:', ensureError);
      }

      // Update user's exam type
      const { error: userError } = await supabase
        .from('users')
        .update({ exam_type: examType })
        .eq('id', user?.id);

      if (userError) throw userError;

      // Save selected subjects
      const subjectsToInsert = selectedSubjects.map(s => ({
        user_id: user?.id,
        subject_id: s.subjectId,
        exam_board: s.examBoard,
      }));

      const { error: subjectsError } = await supabase
        .from('user_subjects')
        .insert(subjectsToInsert);

      if (subjectsError) throw subjectsError;

      // If adding subjects after onboarding, skip topic curation
      if (isAddingSubjects) {
        // Go directly to home - users can customize topics in Topic Hub
        navigation.navigate('HomeMain' as never);
        Alert.alert(
          'Subjects Added!', 
          'Your subjects have been added. You can customize topics anytime from the Topic Hub.',
          [{ text: 'OK' }]
        );
      } else {
        // If in onboarding flow, go to first topic wizard
        (navigation as any).navigate('FirstTopicWizard', { 
          subjects: selectedSubjects,
          examType,
        });
      }
    } catch (error) {
      console.error('Error saving subjects:', error);
      Alert.alert('Error', 'Failed to save subjects');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00F5FF" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 180 + insets.bottom }, // Space for sticky footer + home indicator
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            {Platform.OS === 'web' ? (
              <Text style={{ fontSize: 24, color: "#94A3B8" }}>←</Text>
            ) : (
              <Ionicons name="arrow-back" size={24} color="#94A3B8" />
            )}
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>
              {!selectedExamBoard ? 'Choose your exam board' : 'Select your subjects'}
            </Text>
            <Text style={styles.subtitle}>
              {!selectedExamBoard 
                ? 'To provide you with accurate subject lists and topics, we need to know which exam board you\'re studying with'
                : `Great! Now select your ${examType} subjects from ${selectedExamBoard.code}`}
            </Text>
          </View>

          {!selectedExamBoard ? (
            <View style={styles.examBoardsContainer}>
              <View style={styles.infoBox}>
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 24 }}>ℹ️</Text>
                ) : (
                  <Ionicons name="information-circle" size={24} color="#00F5FF" />
                )}
                <Text style={styles.infoText}>
                  Each exam board has different subjects and topic structures. Selecting your exam board ensures you get the exact curriculum for your studies.
                </Text>
              </View>
              
              <Text style={styles.sectionTitle}>Select your exam board:</Text>
              {examBoards.map((board) => (
                <TouchableOpacity
                  key={board.id}
                  style={styles.examBoardCard}
                  onPress={() => setSelectedExamBoard(board)}
                >
                  <View style={styles.examBoardInfo}>
                    <Text style={styles.examBoardCode}>{board.code}</Text>
                    <Text style={styles.examBoardName}>{board.full_name}</Text>
                  </View>
                  {Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 24, color: "#00F5FF" }}>›</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#00F5FF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.changeExamBoard}
                onPress={() => {
                  setSelectedExamBoard(null);
                  setSelectedSubjects([]);
                  setSearchQuery('');
                }}
              >
                {Platform.OS === 'web' ? (
                  <Text style={{ fontSize: 20 }}>🔄</Text>
                ) : (
                  <Ionicons name="swap-horizontal" size={20} color="#00F5FF" />
                )}
                <Text style={styles.changeExamBoardText}>
                  Change exam board (Currently: {selectedExamBoard.code})
                </Text>
              </TouchableOpacity>

              {loadingSubjects ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#00F5FF" />
                </View>
              ) : (
                <>
                  <View style={styles.searchContainer}>
                    {Platform.OS === 'web' ? (
                      <Text style={[styles.searchIcon, { fontSize: 20 }]}>🔍</Text>
                    ) : (
                      <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                    )}
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search subjects..."
                      placeholderTextColor="#64748B"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        style={styles.clearButton}
                        onPress={() => setSearchQuery('')}
                      >
                        {Platform.OS === 'web' ? (
                          <Text style={{ fontSize: 20 }}>✕</Text>
                        ) : (
                          <Ionicons name="close-circle" size={20} color="#64748B" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.subjectsContainer}>
                    {filteredSubjects.length === 0 ? (
                      <Text style={styles.noSubjectsText}>
                        {searchQuery ? 'No subjects found' : 'No subjects available for this exam board'}
                      </Text>
                    ) : (
                      filteredSubjects.map((subject) => {
                        const isSelected = selectedSubjects.some(s => s.subjectId === subject.id);
                        
                        return (
                          <TouchableOpacity
                            key={subject.id}
                            style={[styles.subjectCard, isSelected && styles.selectedCard]}
                            onPress={() => toggleSubject(subject)}
                          >
                            <Text style={[styles.subjectName, isSelected && styles.selectedText]}>
                              {subject.subject_name}
                            </Text>
                            {Platform.OS === 'web' ? (
                              <Text style={{ fontSize: 28 }}>
                                {isSelected ? "✅" : "➕"}
                              </Text>
                            ) : (
                              <Ionicons 
                                name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                                size={28} 
                                color={isSelected ? "#00F5FF" : "#64748B"} 
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* Sticky floating continue button */}
          {selectedExamBoard && selectedSubjects.length > 0 && (
            <View style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}>
              {showScrollHint && (
                <View style={styles.scrollHintContainer}>
                  <Text style={styles.scrollHintText}>
                    Scroll down to continue or select more subjects
                  </Text>
                  <Text style={styles.scrollHintArrow}>↓</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.stickyButton}
                onPress={handleContinue}
              >
                <Text style={styles.stickyButtonText}>
                  {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
                </Text>
                <Text style={styles.stickyButtonContinue}>Continue →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom continue button (for when scrolled down) */}
          {selectedExamBoard && (
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedSubjects.length === 0 && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={selectedSubjects.length === 0}
            >
              <Text style={styles.continueButtonText}>
                Continue ({selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected) →
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      ` as any,
      backgroundSize: '50px 50px' as any,
    }),
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 180, // Space for sticky footer
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 24,
    padding: 8,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 22,
  },
  examBoardsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  examBoardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  examBoardInfo: {
    flex: 1,
  },
  examBoardCode: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  examBoardName: {
    fontSize: 14,
    color: '#64748B',
  },
  changeExamBoard: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
  },
  changeExamBoardText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#00F5FF',
    marginLeft: 8,
  },
  searchContainer: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#E2E8F0',
  },
  clearButton: {
    padding: 4,
  },
  subjectsContainer: {
    flex: 1,
    marginBottom: 32,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderColor: '#00F5FF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
  },
  selectedText: {
    color: '#00F5FF',
  },
  continueButton: {
    backgroundColor: '#00F5FF',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.6)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  disabledButton: {
    opacity: 0.3,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none',
    } : {
      shadowOpacity: 0,
      elevation: 0,
    }),
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
  noSubjectsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 32,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.1)',
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  stickyFooter: {
    ...(Platform.OS === 'web' ? {
      position: 'fixed' as any,
    } : {
      position: 'absolute',
    }),
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0f1e',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.2)',
    zIndex: 1000,
    elevation: 20,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.8)',
    }),
  },
  scrollHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  scrollHintText: {
    fontSize: 14,
    color: '#94A3B8',
    marginRight: 8,
    fontStyle: 'italic',
  },
  scrollHintArrow: {
    fontSize: 20,
    color: '#00F5FF',
  },
  stickyButton: {
    backgroundColor: '#00F5FF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 30px rgba(0, 245, 255, 0.8)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1,
      shadowRadius: 25,
      elevation: 10,
    }),
  },
  stickyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0f1e',
    marginBottom: 4,
  },
  stickyButtonContinue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a0f1e',
    letterSpacing: 0.5,
  },
});
