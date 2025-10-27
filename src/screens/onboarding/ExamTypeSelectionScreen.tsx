import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';

const examTypes = [
  { id: 'gcse', name: 'GCSE', description: 'General Certificate of Secondary Education' },
  { id: 'alevel', name: 'A-Level', description: 'Advanced Level Qualification' },
  { id: 'btec', name: 'BTEC / Vocational', description: 'Business and Technology Education Council' },
  { id: 'ib', name: 'International Baccalaureate', description: 'IB Diploma Programme' },
  { id: 'igcse', name: 'iGCSE', description: 'International General Certificate of Secondary Education' },
];

export default function ExamTypeSelectionScreen() {
  const navigation = useNavigation();
  const [selectedExamType, setSelectedExamType] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedExamType) {
      navigation.navigate('SubjectSelection' as never, { examType: selectedExamType } as never);
    }
  };

  return (
    <LinearGradient
      colors={['#6366F1', '#8B5CF6']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>What are you studying for?</Text>
            <Text style={styles.subtitle}>Select your exam type</Text>
          </View>

          <View style={styles.optionsContainer}>
            {examTypes.map((exam) => (
              <TouchableOpacity
                key={exam.id}
                style={[
                  styles.optionCard,
                  selectedExamType === exam.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedExamType(exam.id)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionTitle,
                    selectedExamType === exam.id && styles.selectedText,
                  ]}>
                    {exam.name}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    selectedExamType === exam.id && styles.selectedDescription,
                  ]}>
                    {exam.description}
                  </Text>
                </View>
                {selectedExamType === exam.id && (
                  <Icon name="checkmark-circle" size={24} color="#6366F1" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedExamType && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!selectedExamType}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
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
  optionsContainer: {
    flex: 1,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedText: {
    color: '#6366F1',
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDescription: {
    color: '#8B5CF6',
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