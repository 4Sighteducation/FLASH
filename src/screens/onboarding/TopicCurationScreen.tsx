import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TopicEditModal from '../../components/TopicEditModal';
import ColorPickerModal from '../../components/ColorPickerModal';
import { SelectedSubject } from '../../types';

export default function TopicCurationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { subjects, examType } = route.params as { 
    subjects: SelectedSubject[]; 
    examType: string;
  };

  const [selectedSubject, setSelectedSubject] = useState<SelectedSubject | null>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [completedSubjects, setCompletedSubjects] = useState<string[]>([]);

  const handleSubjectPress = (subject: SelectedSubject) => {
    setSelectedSubject(subject);
    setShowTopicModal(true);
  };

  const handleTopicsSaved = () => {
    setShowTopicModal(false);
    setShowColorModal(true);
  };

  const handleColorSelected = (color: string) => {
    if (selectedSubject) {
      setCompletedSubjects([...completedSubjects, selectedSubject.subjectName]);
      setShowColorModal(false);
      setSelectedSubject(null);
    }
  };

  const handleComplete = () => {
    navigation.navigate('OnboardingComplete' as never);
  };

  const allSubjectsCompleted = completedSubjects.length === subjects.length;

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
            <Text style={styles.title}>Customize your topics</Text>
            <Text style={styles.subtitle}>
              Click on each subject to curate your topic list
            </Text>
          </View>

          <View style={styles.subjectsContainer}>
            {subjects.map((subject) => {
              const isCompleted = completedSubjects.includes(subject.subjectName);
              
              return (
                <TouchableOpacity
                  key={subject.subjectId}
                  style={[styles.subjectCard, isCompleted && styles.completedCard]}
                  onPress={() => !isCompleted && handleSubjectPress(subject)}
                  disabled={isCompleted}
                >
                  <View style={styles.subjectContent}>
                    <Text style={[styles.subjectName, isCompleted && styles.completedText]}>
                      {subject.subjectName}
                    </Text>
                    <Text style={[styles.examBoard, isCompleted && styles.completedExamBoard]}>
                      {subject.examBoard}
                    </Text>
                  </View>
                  {isCompleted ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#6B7280" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {completedSubjects.length} of {subjects.length} subjects customized
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(completedSubjects.length / subjects.length) * 100}%` }
                ]} 
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !allSubjectsCompleted && styles.disabledButton,
            ]}
            onPress={handleComplete}
            disabled={!allSubjectsCompleted}
          >
            <Text style={styles.continueButtonText}>
              {allSubjectsCompleted ? 'Complete Setup' : 'Customize all subjects to continue'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {selectedSubject && (
        <>
          <TopicEditModal
            visible={showTopicModal}
            subject={selectedSubject}
            onClose={() => setShowTopicModal(false)}
            onSave={handleTopicsSaved}
          />
          <ColorPickerModal
            visible={showColorModal}
            subjectName={selectedSubject.subjectName}
            subjectId={selectedSubject.subjectId}
            onClose={() => setShowColorModal(false)}
            onColorSelected={handleColorSelected}
          />
        </>
      )}
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
    lineHeight: 22,
  },
  subjectsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  completedText: {
    color: '#10B981',
  },
  examBoard: {
    fontSize: 14,
    color: '#6B7280',
  },
  completedExamBoard: {
    color: '#10B981',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    textAlign: 'center',
  },
}); 