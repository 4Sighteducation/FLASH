import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Subject {
  id: string;
  name: string;
  exam_board: string;
}

interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  examBoard: string;
}

const examBoards = ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA', 'Other'];

export default function SubjectSelectionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { examType } = route.params as { examType: string };
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      // Fetch unique subjects from exam_board_subjects
      const { data, error } = await supabase
        .from('exam_board_subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;

      // Get unique subject names
      const uniqueSubjects = data?.reduce((acc: Subject[], curr: any) => {
        if (!acc.find(s => s.name === curr.name)) {
          acc.push({ id: curr.id, name: curr.name, exam_board: '' });
        }
        return acc;
      }, []) || [];

      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subject: Subject) => {
    const existingIndex = selectedSubjects.findIndex(s => s.subjectName === subject.name);
    
    if (existingIndex >= 0) {
      // Remove subject
      setSelectedSubjects(selectedSubjects.filter((_, index) => index !== existingIndex));
    } else {
      // Add subject with default exam board
      setSelectedSubjects([...selectedSubjects, {
        subjectId: subject.id,
        subjectName: subject.name,
        examBoard: 'AQA', // Default exam board
      }]);
    }
  };

  const updateExamBoard = (subjectName: string, examBoard: string) => {
    setSelectedSubjects(selectedSubjects.map(s => 
      s.subjectName === subjectName ? { ...s, examBoard } : s
    ));
  };

  const handleContinue = async () => {
    if (selectedSubjects.length === 0) return;

    try {
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

      // Navigate to topic curation
      navigation.navigate('TopicCuration' as never, { 
        subjects: selectedSubjects,
        examType 
      } as never);
    } catch (error) {
      console.error('Error saving subjects:', error);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.container}>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Select your subjects</Text>
            <Text style={styles.subtitle}>Choose subjects and their exam boards</Text>
          </View>

          <View style={styles.subjectsContainer}>
            {subjects.map((subject) => {
              const isSelected = selectedSubjects.some(s => s.subjectName === subject.name);
              const selectedSubject = selectedSubjects.find(s => s.subjectName === subject.name);
              
              return (
                <View key={subject.id} style={styles.subjectWrapper}>
                  <TouchableOpacity
                    style={[styles.subjectCard, isSelected && styles.selectedCard]}
                    onPress={() => toggleSubject(subject)}
                  >
                    <Text style={[styles.subjectName, isSelected && styles.selectedText]}>
                      {subject.name}
                    </Text>
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "add-circle-outline"} 
                      size={24} 
                      color={isSelected ? "#6366F1" : "#9CA3AF"} 
                    />
                  </TouchableOpacity>
                  
                  {isSelected && (
                    <View style={styles.examBoardContainer}>
                      <Text style={styles.examBoardLabel}>Exam Board:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {examBoards.map((board) => (
                          <TouchableOpacity
                            key={board}
                            style={[
                              styles.examBoardChip,
                              selectedSubject?.examBoard === board && styles.selectedExamBoard,
                            ]}
                            onPress={() => updateExamBoard(subject.name, board)}
                          >
                            <Text style={[
                              styles.examBoardText,
                              selectedSubject?.examBoard === board && styles.selectedExamBoardText,
                            ]}>
                              {board}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              selectedSubjects.length === 0 && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={selectedSubjects.length === 0}
          >
            <Text style={styles.continueButtonText}>
              Continue ({selectedSubjects.length} subjects selected)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingBottom: 24,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  subjectsContainer: {
    flex: 1,
    marginBottom: 32,
  },
  subjectWrapper: {
    marginBottom: 16,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectedText: {
    color: '#6366F1',
  },
  examBoardContainer: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  examBoardLabel: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 8,
  },
  examBoardChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedExamBoard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6366F1',
  },
  examBoardText: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  selectedExamBoardText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366F1',
  },
}); 