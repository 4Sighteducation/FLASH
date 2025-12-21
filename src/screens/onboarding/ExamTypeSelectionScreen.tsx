import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
  const insets = useSafeAreaInsets();

  const handleContinue = () => {
    if (selectedExamType) {
      navigation.navigate('SubjectSearch' as never, { examType: selectedExamType } as never);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 110 + insets.bottom },
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
                  Platform.OS === 'web' ? (
                    <Text style={{ fontSize: 28 }}>✅</Text>
                  ) : (
                    <Ionicons name="checkmark-circle" size={28} color="#00F5FF" />
                  )
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyFooter, { paddingBottom: 12 + insets.bottom }]}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedExamType && styles.disabledButton,
            ]}
            onPress={handleContinue}
            disabled={!selectedExamType}
          >
            <Text style={styles.continueButtonText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    ...(Platform.OS === 'web' && {
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
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 32,
  },
  optionCard: {
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
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E2E8F0',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  selectedText: {
    color: '#00F5FF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  selectedDescription: {
    color: '#94A3B8',
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
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.15)',
    backgroundColor: '#0a0f1e',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
}); 