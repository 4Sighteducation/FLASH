import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateCardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { topicId, topicName, subjectName } = route.params as {
    topicId: string;
    topicName: string;
    subjectName: string;
  };

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) {
      Alert.alert('Error', 'Please enter both question and answer');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user?.id,
          topic_id: topicId,
          question: question.trim(),
          answer: answer.trim(),
          // TODO: Add difficulty once column is added to database
          // difficulty,
          box_number: 1, // Start in box 1 for Leitner system
        });

      if (error) throw error;

      Alert.alert('Success', 'Flashcard created!', [
        { 
          text: 'Create Another', 
          onPress: () => {
            setQuestion('');
            setAnswer('');
          }
        },
        { 
          text: 'Done', 
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      Alert.alert('Error', 'Failed to create flashcard');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = () => {
    Alert.alert(
      'AI Generation',
      'AI flashcard generation will be available soon!',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Flashcard</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topicInfo}>
            <Text style={styles.subjectName}>{subjectName}</Text>
            <Text style={styles.topicName}>{topicName}</Text>
          </View>

          <TouchableOpacity style={styles.aiButton} onPress={handleAIGenerate}>
            <Ionicons name="sparkles" size={20} color="#6366F1" />
            <Text style={styles.aiButtonText}>Generate with AI</Text>
          </TouchableOpacity>

          <View style={styles.formSection}>
            <Text style={styles.label}>Question</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter your question..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={question}
              onChangeText={setQuestion}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Answer</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter the answer..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={answer}
              onChangeText={setAnswer}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Difficulty</Text>
            <View style={styles.difficultyContainer}>
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.difficultyButton,
                    difficulty === level && styles.difficultyButtonActive,
                    difficulty === level && {
                      backgroundColor: 
                        level === 'easy' ? '#10B981' :
                        level === 'medium' ? '#F59E0B' :
                        '#EF4444'
                    }
                  ]}
                  onPress={() => setDifficulty(level)}
                >
                  <Text style={[
                    styles.difficultyText,
                    difficulty === level && styles.difficultyTextActive
                  ]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>
              <Ionicons name="bulb-outline" size={16} color="#6366F1" /> Tips
            </Text>
            <Text style={styles.tipText}>• Keep questions clear and concise</Text>
            <Text style={styles.tipText}>• Focus on one concept per card</Text>
            <Text style={styles.tipText}>• Use active recall principles</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  topicInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  subjectName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  difficultyButtonActive: {
    borderWidth: 0,
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  difficultyTextActive: {
    color: '#FFFFFF',
  },
  tips: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
    paddingLeft: 8,
  },
}); 