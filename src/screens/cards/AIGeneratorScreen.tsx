import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AIService, CardGenerationParams, GeneratedCard } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import FlashcardCard from '../../components/FlashcardCard';

type CardType = 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'notes';

interface CardTypeOption {
  id: CardType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  available: boolean;
}

const cardTypes: CardTypeOption[] = [
  {
    id: 'multiple_choice',
    title: 'Multiple Choice',
    description: 'Questions with 4 answer options',
    icon: 'list-circle-outline',
    available: true,
  },
  {
    id: 'short_answer',
    title: 'Short Answer',
    description: 'Questions requiring brief responses',
    icon: 'create-outline',
    available: true,
  },
  {
    id: 'essay',
    title: 'Essay Style',
    description: 'In-depth analysis questions',
    icon: 'document-text-outline',
    available: true,
  },
  {
    id: 'acronym',
    title: 'Acronym',
    description: 'Memory aids using acronyms',
    icon: 'text-outline',
    available: true,
  },
  {
    id: 'notes',
    title: 'Create from Notes',
    description: 'Scan notes to create cards',
    icon: 'camera-outline',
    available: false,
  },
];

export default function AIGeneratorScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { subject, topic, topicId, examBoard, examType } = route.params as any;

  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [numCards, setNumCards] = useState('5');
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'options' | 'preview'>('select');
  const [aiService] = useState(() => new AIService());

  const handleGenerateCards = async () => {
    if (!selectedType || selectedType === 'notes') return;

    setIsGenerating(true);
    try {
      const params: CardGenerationParams = {
        subject,
        topic,
        examBoard,
        examType,
        questionType: selectedType as 'multiple_choice' | 'short_answer' | 'essay' | 'acronym',
        numCards: parseInt(numCards, 10),
        contentGuidance: additionalGuidance,
      };

      console.log('🎨 Generating cards with full params:', {
        subject,
        topic,
        examBoard,
        examType,
        questionType: selectedType,
        numCards: parseInt(numCards, 10),
        topicId,
      });

      const cards = await aiService.generateCards(params);
      setGeneratedCards(cards);
      setCurrentStep('preview');
    } catch (error: any) {
      Alert.alert('Generation Error', error.message || 'Failed to generate cards');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCards = async () => {
    console.log('💾 Save button clicked!', {
      hasUser: !!user,
      selectedType,
      cardsCount: generatedCards.length
    });
    
    if (!user || !selectedType || selectedType === 'notes') {
      console.log('❌ Save cancelled - missing requirements');
      return;
    }

    console.log('✅ Showing save dialog...');
    
    // WEB FIX: Alert.alert doesn't work on web, use confirm instead
    if (Platform.OS === 'web') {
      const addToStudyBank = window.confirm(
        'Save these cards?\n\nClick OK to add to Study Bank (for immediate review)\nClick Cancel to add to Card Bank only'
      );
      console.log('User selected via web confirm:', addToStudyBank ? 'Study Bank' : 'Card Bank Only');
      saveCards(addToStudyBank);
    } else {
      // Native: Use Alert.alert
      Alert.alert(
        'Add to Study Bank?',
        'These cards will be added to your Card Bank. Do you also want to add them to your Study Bank for immediate review?',
        [
          {
            text: 'No, Card Bank Only',
            onPress: () => {
              console.log('User selected: Card Bank Only');
              saveCards(false);
            },
            style: 'cancel'
          },
          {
            text: 'Yes, Add to Study Bank Too',
            onPress: () => {
              console.log('User selected: Study Bank Too');
              saveCards(true);
            },
            style: 'default'
          }
        ]
      );
    }
  };

  const saveCards = async (addToStudyBank: boolean) => {
    console.log('💾 Starting save process...', { addToStudyBank });
    
    if (!user || !selectedType || selectedType === 'notes') return;

    setIsSaving(true);
    try {
      console.log('📝 Saving cards to database...');
      await aiService.saveGeneratedCards(
        generatedCards,
        {
          subject,
          topic,
          topicId,
          examBoard,
          examType,
          questionType: selectedType as 'multiple_choice' | 'short_answer' | 'essay' | 'acronym',
          numCards: generatedCards.length,
        },
        user.id,
        addToStudyBank
      );

      // Mark topic as discovered (NEW!)
      const routeParams = (route.params as any);
      if (topicId && routeParams?.subjectId) {
        console.log('📍 Marking topic as discovered...');
        
        const { error: discoveryError } = await supabase.rpc('discover_topic', {
          p_user_id: user.id,
          p_subject_id: routeParams.subjectId,
          p_topic_id: topicId,
          p_discovery_method: routeParams.discoveryMethod || 'search',
          p_search_query: routeParams.searchQuery || topic,
        });

        if (discoveryError) {
          console.error('Error marking topic as discovered:', discoveryError);
          // Don't fail the whole operation if discovery tracking fails
        } else {
          console.log('✅ Topic marked as discovered!');
        }
      }

      // Small delay to ensure database updates are processed
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      // Success modal - works on web and native
      if (Platform.OS === 'web') {
        const message = `✅ ${generatedCards.length} cards saved successfully!\n\n${addToStudyBank ? '📚 Added to Study Bank - ready to review!' : '💾 Saved to Card Bank'}`;
        window.alert(message);
        // Navigate to Home on web
        (navigation.navigate as any)('Home');
      } else {
        Alert.alert(
          'Success',
          `${generatedCards.length} cards saved successfully!${addToStudyBank ? ' Cards added to Study Bank.' : ''}`,
          [{ 
            text: 'OK', 
            onPress: () => {
              navigation.navigate('Home' as never);
            }
          }]
        );
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`❌ Save Error: ${error.message || 'Failed to save cards'}`);
      } else {
        Alert.alert('Save Error', error.message || 'Failed to save cards');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderCardTypeSelection = () => (
    <View style={styles.cardTypesContainer}>
      <Text style={styles.sectionTitle}>Select Card Type</Text>
      {cardTypes.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.cardTypeOption,
            selectedType === type.id && styles.selectedCardType,
            !type.available && styles.disabledCardType,
          ]}
          onPress={() => type.available && setSelectedType(type.id)}
          disabled={!type.available}
        >
          <View style={styles.cardTypeIcon}>
            <Ionicons
              name={type.icon}
              size={24}
              color={
                !type.available
                  ? '#ccc'
                  : selectedType === type.id
                  ? '#007AFF'
                  : '#666'
              }
            />
          </View>
          <View style={styles.cardTypeInfo}>
            <Text style={[styles.cardTypeTitle, !type.available && styles.disabledText]}>
              {type.title}
            </Text>
            <Text style={[styles.cardTypeDescription, !type.available && styles.disabledText]}>
              {type.description}
            </Text>
            {!type.available && (
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.sectionTitle}>Generation Options</Text>
      
      <View style={styles.optionGroup}>
        <Text style={styles.optionLabel}>Number of Cards</Text>
        <TextInput
          style={styles.numberInput}
          value={numCards}
          onChangeText={setNumCards}
          keyboardType="number-pad"
          maxLength={2}
        />
      </View>

      <View style={styles.optionGroup}>
        <Text style={styles.optionLabel}>Additional Guidance (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={additionalGuidance}
          onChangeText={setAdditionalGuidance}
          placeholder="e.g., Focus on key dates, Include practical examples..."
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderPreview = () => (
    <ScrollView style={styles.previewContainer}>
      <Text style={styles.sectionTitle}>Generated Cards Preview</Text>
      {generatedCards.map((card, index) => {
        // Convert generated card to flashcard format
        const flashcard = {
          id: `preview-${index}`,
          question: card.question,
          answer: card.answer,
          card_type: selectedType as 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'manual',
          options: card.options,
          correct_answer: card.correctAnswer,
          key_points: card.keyPoints,
          detailed_answer: card.detailedAnswer,
          box_number: 1,
          topic: topic,
        };

        return (
          <View key={index} style={styles.previewCardWrapper}>
            <FlashcardCard
              card={flashcard}
              color="#6366F1"
              showDeleteButton={false}
            />
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Card Generator</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.topicInfo}>
        <Text style={styles.topicSubject}>{subject}</Text>
        <Text style={styles.topicName}>{topic}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {currentStep === 'select' && renderCardTypeSelection()}
        {currentStep === 'options' && renderOptions()}
        {currentStep === 'preview' && renderPreview()}

        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Generating cards...</Text>
          </View>
        )}

        {isSaving && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Saving cards...</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <View style={styles.bottomButtons}>
        {currentStep === 'select' && selectedType && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep('options')}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
        
        {currentStep === 'options' && (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep('select')}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGenerateCards}
              disabled={isGenerating}
            >
              <Text style={styles.primaryButtonText}>Generate</Text>
            </TouchableOpacity>
          </>
        )}
        
        {currentStep === 'preview' && (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setGeneratedCards([]);
                setCurrentStep('options');
              }}
            >
              <Text style={styles.secondaryButtonText}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSaveCards}
            >
              <Text style={styles.primaryButtonText}>Save All Cards</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  topicInfo: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  topicSubject: {
    fontSize: 14,
    color: '#666',
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  cardTypesContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  cardTypeOption: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCardType: {
    borderColor: '#007AFF',
  },
  disabledCardType: {
    opacity: 0.6,
  },
  cardTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardTypeInfo: {
    flex: 1,
  },
  cardTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardTypeDescription: {
    fontSize: 14,
    color: '#666',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 4,
  },
  disabledText: {
    color: '#ccc',
  },
  optionsContainer: {
    flex: 1,
  },
  optionGroup: {
    marginBottom: 24,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: 100,
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
  },
  previewCardWrapper: {
    padding: 16,
  },
}); 