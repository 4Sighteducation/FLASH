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
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext.mock';

type CardType = 'short_answer' | 'essay' | 'multiple_choice' | 'manual';

interface CardTypeOption {
  id: CardType;
  name: string;
  icon: string;
  description: string;
}

const cardTypes: CardTypeOption[] = [
  {
    id: 'short_answer',
    name: 'Short Answer',
    icon: 'text-outline',
    description: 'Brief response required',
  },
  {
    id: 'essay',
    name: 'Essay',
    icon: 'document-text-outline',
    description: 'Detailed explanation needed',
  },
  {
    id: 'multiple_choice',
    name: 'Multiple Choice',
    icon: 'list-outline',
    description: 'Select from options',
  },
];

export default function CreateCardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tier, checkLimits } = useSubscription();
  const { topicId, topicName, subjectName } = route.params as {
    topicId: string;
    topicName: string;
    subjectName: string;
  };

  const [cardType, setCardType] = useState<CardType>('short_answer');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  
  // Multiple choice specific state
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctChoice, setCorrectChoice] = useState(0);

  const handleSave = async () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    // Check card limits for lite users
    if (tier === 'lite') {
      const { data: userCards, error } = await supabase
        .from('flashcards')
        .select('id')
        .eq('user_id', user?.id);
      
      const currentCardCount = userCards?.length || 0;
      
      if (!checkLimits('card', currentCardCount + 1)) {
        Alert.alert(
          'Upgrade Required',
          `You've reached the 10 card limit for the free version. Upgrade to FLASH Full for unlimited cards!`,
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Profile' as never) }
          ]
        );
        return;
      }
    }

    if (cardType === 'multiple_choice') {
      // Validate multiple choice
      const filledChoices = choices.filter(c => c.trim());
      if (filledChoices.length < 2) {
        Alert.alert('Error', 'Please provide at least 2 choices');
        return;
      }
      if (!choices[correctChoice].trim()) {
        Alert.alert('Error', 'The correct answer cannot be empty');
        return;
      }
    } else {
      // Validate other types
      if (!answer.trim()) {
        Alert.alert('Error', 'Please enter an answer');
        return;
      }
    }

    setLoading(true);
    try {
      let flashcardData: any = {
        user_id: user?.id,
        topic_id: topicId,
        question: question.trim(),
        card_type: cardType,
        box_number: 1,
        subject_name: subjectName,
        topic: topicName,
      };

      if (cardType === 'multiple_choice') {
        // For multiple choice, store choices and correct answer
        flashcardData.answer = choices[correctChoice].trim();
        flashcardData.choices = choices.filter(c => c.trim()).map(c => c.trim());
        flashcardData.correct_choice = correctChoice;
      } else {
        flashcardData.answer = answer.trim();
      }

      // Ask user if they want to add to study bank
      Alert.alert(
        'Add to Study Bank?',
        'This card will be added to your Card Bank. Do you also want to add it to your Study Bank for immediate review?',
        [
          {
            text: 'No, Card Bank Only',
            onPress: () => saveCard(flashcardData, false),
            style: 'cancel'
          },
          {
            text: 'Yes, Add to Study Bank Too',
            onPress: () => saveCard(flashcardData, true),
            style: 'default'
          }
        ]
      );
    } catch (error) {
      console.error('Error creating flashcard:', error);
      Alert.alert('Error', 'Failed to create flashcard');
    } finally {
      setLoading(false);
    }
  };

  const saveCard = async (flashcardData: any, addToStudyBank: boolean) => {
    try {
      // Add study bank fields
      flashcardData.in_study_bank = addToStudyBank;
      flashcardData.added_to_study_bank_at = addToStudyBank ? new Date().toISOString() : null;
      flashcardData.next_review_date = new Date().toISOString();
      
      // Fix field names for database
      if (flashcardData.topic) {
        flashcardData.topic_name = flashcardData.topic;
        delete flashcardData.topic;
      }
      
      // Fix multiple choice fields
      if (cardType === 'multiple_choice' && flashcardData.choices) {
        flashcardData.options = flashcardData.choices;
        flashcardData.correct_answer = flashcardData.answer;
        delete flashcardData.choices;
        delete flashcardData.correct_choice;
      }

      const { error } = await supabase
        .from('flashcards')
        .insert(flashcardData);

      if (error) throw error;

      // Update topic study preference if adding to study bank
      if (addToStudyBank && topicId) {
        const { error: prefError } = await supabase
          .from('topic_study_preferences')
          .upsert({
            user_id: user?.id,
            topic_id: topicId,
            in_study_bank: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,topic_id'
          });

        if (prefError) {
          console.error('Error updating topic study preference:', prefError);
        }
      }

      Alert.alert(
        'Success', 
        `Flashcard created!${addToStudyBank ? ' Card added to Study Bank.' : ''}`,
        [
          { 
            text: 'Create Another', 
            onPress: () => {
              setQuestion('');
              setAnswer('');
              setChoices(['', '', '', '']);
              setCorrectChoice(0);
            }
          },
          { 
            text: 'Done', 
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving flashcard:', error);
      Alert.alert('Error', 'Failed to save flashcard');
    } finally {
      setLoading(false);
    }
  };

  const renderCardTypeModal = () => (
    <Modal
      visible={showTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTypeModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTypeModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Card Type</Text>
          {cardTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeOption,
                cardType === type.id && styles.selectedTypeOption,
              ]}
              onPress={() => {
                setCardType(type.id);
                setShowTypeModal(false);
              }}
            >
              <View style={styles.typeOptionIcon}>
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={cardType === type.id ? '#6366F1' : '#6B7280'} 
                />
              </View>
              <View style={styles.typeOptionInfo}>
                <Text style={[
                  styles.typeOptionName,
                  cardType === type.id && styles.selectedTypeText
                ]}>
                  {type.name}
                </Text>
                <Text style={styles.typeOptionDescription}>
                  {type.description}
                </Text>
              </View>
              {cardType === type.id && (
                <Icon name="checkmark-circle" size={24} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderMultipleChoiceInputs = () => (
    <View style={styles.formSection}>
      <Text style={styles.label}>Answer Choices</Text>
      {choices.map((choice, index) => (
        <View key={index} style={styles.choiceContainer}>
          <TouchableOpacity
            style={[
              styles.radioButton,
              correctChoice === index && styles.radioButtonSelected,
            ]}
            onPress={() => setCorrectChoice(index)}
          >
            {correctChoice === index && (
              <View style={styles.radioButtonInner} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[
              styles.choiceInput,
              correctChoice === index && styles.correctChoiceInput,
            ]}
            placeholder={`Choice ${index + 1}`}
            placeholderTextColor="#9CA3AF"
            value={choice}
            onChangeText={(text: string) => {
              const newChoices = [...choices];
              newChoices[index] = text;
              setChoices(newChoices);
            }}
          />
        </View>
      ))}
      <Text style={styles.helperText}>
        Select the correct answer by tapping the circle
      </Text>
    </View>
  );

  const renderAnswerInput = () => (
    <View style={styles.formSection}>
      <Text style={styles.label}>Answer</Text>
      <TextInput
        style={[
          styles.textArea,
          cardType === 'essay' && styles.largeTextArea,
        ]}
        placeholder={
          cardType === 'essay' 
            ? "Enter a detailed answer with key points..."
            : "Enter the answer..."
        }
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={cardType === 'essay' ? 8 : 4}
        value={answer}
        onChangeText={setAnswer}
        textAlignVertical="top"
      />
    </View>
  );

  const currentCardType = cardTypes.find(t => t.id === cardType);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="close" size={24} color="#333" />
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

          <TouchableOpacity 
            style={styles.typeSelector}
            onPress={() => setShowTypeModal(true)}
          >
            <View style={styles.typeSelectorContent}>
              <Ionicons 
                name={currentCardType?.icon as any} 
                size={24} 
                color="#6366F1" 
              />
              <View style={styles.typeSelectorInfo}>
                <Text style={styles.typeSelectorLabel}>Card Type</Text>
                <Text style={styles.typeSelectorValue}>{currentCardType?.name}</Text>
              </View>
            </View>
            <Icon name="chevron-down" size={20} color="#6B7280" />
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

          {cardType === 'multiple_choice' ? renderMultipleChoiceInputs() : renderAnswerInput()}

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
              <Icon name="bulb-outline" size={16} color="#6366F1" /> Tips for {currentCardType?.name}
            </Text>
            {cardType === 'multiple_choice' && (
              <>
                <Text style={styles.tipText}>• Make all choices plausible</Text>
                <Text style={styles.tipText}>• Avoid "all of the above" options</Text>
                <Text style={styles.tipText}>• Keep choices similar in length</Text>
              </>
            )}
            {cardType === 'short_answer' && (
              <>
                <Text style={styles.tipText}>• Keep questions clear and concise</Text>
                <Text style={styles.tipText}>• Focus on one concept per card</Text>
                <Text style={styles.tipText}>• Use active recall principles</Text>
              </>
            )}
            {cardType === 'essay' && (
              <>
                <Text style={styles.tipText}>• Ask for analysis or explanation</Text>
                <Text style={styles.tipText}>• Include key points in the answer</Text>
                <Text style={styles.tipText}>• Perfect for complex topics</Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {renderCardTypeModal()}
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
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeSelectorInfo: {
    gap: 2,
  },
  typeSelectorLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  typeSelectorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
  largeTextArea: {
    minHeight: 200,
  },
  choiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6366F1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366F1',
  },
  choiceInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  correctChoiceInput: {
    borderColor: '#6366F1',
    backgroundColor: '#EDE9FE',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  selectedTypeOption: {
    backgroundColor: '#EDE9FE',
  },
  typeOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  typeOptionInfo: {
    flex: 1,
  },
  typeOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectedTypeText: {
    color: '#6366F1',
  },
  typeOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 