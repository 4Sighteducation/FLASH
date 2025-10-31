import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TopicEditModal from '../../components/TopicEditModal';
import ColorPickerModal from '../../components/ColorPickerModal';
import { SelectedSubject } from '../../types';

export default function TopicCurationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { subjects, examType, isAddingSubjects } = route.params as { 
    subjects: SelectedSubject[]; 
    examType: string;
    isAddingSubjects?: boolean;
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
    if (isAddingSubjects) {
      // If adding subjects after onboarding, go back to home
      navigation.navigate('HomeMain' as never);
    } else {
      // If in onboarding flow, go to completion screen
      navigation.navigate('OnboardingComplete' as never);
    }
  };

  const allSubjectsCompleted = completedSubjects.length === subjects.length;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Customize your topics</Text>
            <Text style={styles.subtitle}>
              Click on each subject to curate your topic list
            </Text>
          </View>

          {/* Importance Banner */}
          <View style={styles.importanceBanner}>
            <View style={styles.bannerIconContainer}>
              <Ionicons name="bulb" size={28} color="#FFD700" />
            </View>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Why This Matters 🎯</Text>
              <Text style={styles.bannerText}>
                Simply understanding all the topics in your course is an amazing way to 
                contextualize what you're studying. Take a moment to review and customize 
                each topic list - it's a powerful learning technique!
              </Text>
            </View>
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
                    <Ionicons name="checkmark-circle" size={28} color="#00F5FF" />
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#64748B" />
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
              {allSubjectsCompleted 
                ? (isAddingSubjects ? 'Add Subjects' : 'Complete Setup →')
                : 'Customize all subjects to continue'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    }),
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  backButton: {
    marginBottom: 24,
    padding: 8,
  },
  header: {
    marginBottom: 24,
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
  importanceBanner: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  bannerIconContainer: {
    marginRight: 16,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  bannerText: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  subjectsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedCard: {
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderColor: '#00F5FF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 245, 255, 0.2)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 3,
    }),
  },
  subjectContent: {
    flex: 1,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  completedText: {
    color: '#00F5FF',
  },
  examBoard: {
    fontSize: 14,
    color: '#64748B',
  },
  completedExamBoard: {
    color: '#94A3B8',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00F5FF',
    borderRadius: 4,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 10px rgba(0, 245, 255, 0.5)',
    } : {
      shadowColor: '#00F5FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 5,
    }),
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
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
