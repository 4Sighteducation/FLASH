import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { AIService, GeneratedCard } from '../../services/aiService';
import FlashcardCard from '../../components/FlashcardCard';
import { getUserFlashcardCount } from '../../utils/usageCounts';
import { navigateToPaywall } from '../../utils/upgradePrompt';

type CardType = 'multiple_choice' | 'short_answer' | 'essay' | 'acronym';

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
];

export default function ImageCardGeneratorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tier, limits } = useSubscription();
  const { topicId, topicName, subjectName, examBoard, examType } = route.params as any;

  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'review' | 'options' | 'preview'>('select');
  const [selectedCardType, setSelectedCardType] = useState<CardType | null>(null);
  const [numCards, setNumCards] = useState('5');
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    };

    try {
      let result;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission needed', 'Camera permission is required');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Compress image if needed
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        setImage(manipResult.uri);
        setStep('review');
        
        // Extract text from image
        if (manipResult.base64) {
          await extractTextFromImage(manipResult.base64);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const extractTextFromImage = async (base64Image: string) => {
    setLoading(true);
    let extractedText = '';

    try {
      // Call Supabase Edge Function for OCR
      const { data, error } = await supabase.functions.invoke('vision-ocr', {
        body: { image: base64Image }
      });

      if (data?.text) {
        extractedText = data.text;
        setExtractedText(extractedText);
        
        if (!extractedText.trim()) {
          Alert.alert('No Text Found', 'Could not extract any text from the image. Please try a clearer image.');
          setStep('select');
        }
      } else if (error) {
        throw new Error(error.message || 'Edge Function error');
      }

      // If we get here, something went wrong
      if (!extractedText) {
        throw new Error('No text found in image');
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      // Only show error if we don't have extracted text
      if (!extractedText) {
        Alert.alert(
          'OCR Error', 
          error.message || 'Failed to extract text from image. Please try again.',
          [
            { text: 'OK', onPress: () => setStep('select') },
            { text: 'View Details', onPress: () => Alert.alert('Error Details', JSON.stringify(error, null, 2)) }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const generateCardsFromText = async () => {
    if (!extractedText.trim() || !selectedCardType) {
      Alert.alert('Error', 'Please select a card type');
      return;
    }

    const requested = Math.max(1, parseInt(numCards || '0', 10) || 0);

    // Hard gate Free tier at 10 total created cards (avoid spending AI calls if user is capped)
    if (tier === 'free' && user?.id && limits.maxCards > 0) {
      const currentCount = await getUserFlashcardCount(user.id);
      const remaining = Math.max(0, limits.maxCards - currentCount);

      if (remaining <= 0) {
        Alert.alert(
          'Free plan limit reached',
          "You've reached the 10-card limit on the Free plan. Upgrade to Premium for unlimited flashcards.",
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'View plans',
              onPress: () => navigateToPaywall(navigation),
            },
          ]
        );
        return;
      }

      if (requested > remaining) {
        Alert.alert(
          'Free plan limit',
          `The Free plan allows up to 10 total flashcards. You can generate ${remaining} more right now, or upgrade for unlimited.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Generate ${remaining}`,
              onPress: () => setNumCards(String(remaining)),
            },
            {
              text: 'View plans',
              onPress: () => navigateToPaywall(navigation),
            },
          ]
        );
        return;
      }
    }

    setLoading(true);

    try {
      const aiService = new AIService();
      
      // Combine extracted text with additional guidance
      const fullGuidance = additionalGuidance 
        ? `${additionalGuidance}\n\nBased on the following extracted text, generate complete flashcards with both questions AND detailed answers:\n\n${extractedText}`
        : `Based on the following extracted text, generate complete flashcards with both questions AND detailed answers. Make sure each answer is comprehensive and directly answers the question using information from the text:\n\n${extractedText}`;

      const cards = await aiService.generateCards({
        subject: subjectName,
        topic: topicName,
        examBoard,
        examType,
        questionType: selectedCardType,
        numCards: requested,
        contentGuidance: fullGuidance,
      });
      
      setGeneratedCards(cards);
      setStep('preview');
    } catch (error: any) {
      console.error('Generation Error:', error);
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const saveCards = async () => {
    if (!user || !selectedCardType) return;

    setIsSaving(true);
    try {
      // Hard gate Free tier at 10 total created cards when saving AI batches
      if (tier === 'free' && limits.maxCards > 0) {
        const currentCount = await getUserFlashcardCount(user.id);
        const remaining = Math.max(0, limits.maxCards - currentCount);

        if (remaining <= 0) {
          Alert.alert(
            'Free plan limit reached',
            "You've reached the 10-card limit on the Free plan. Upgrade to Premium for unlimited flashcards.",
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'View plans',
                onPress: () => navigateToPaywall(navigation),
              },
            ]
          );
          return;
        }

        if (generatedCards.length > remaining) {
          Alert.alert(
            'Free plan limit',
            `You can only save ${remaining} more card${remaining === 1 ? '' : 's'} on the Free plan. Delete some preview cards, or upgrade for unlimited.`,
            [
              { text: 'OK', style: 'cancel' },
              {
                text: 'View plans',
                onPress: () => navigateToPaywall(navigation),
              },
            ]
          );
          return;
        }
      }

      await new AIService().saveGeneratedCards(
        generatedCards,
        {
          subject: subjectName,
          topic: topicName,
          topicId,
          examBoard,
          examType,
          questionType: selectedCardType,
          numCards: generatedCards.length,
        },
        user.id
      );

      // Small delay to ensure database updates
      await new Promise<void>(resolve => setTimeout(resolve, 500));

      Alert.alert(
        'Success!', 
        `${generatedCards.length} flashcards created from your image!`,
        [{ 
          text: 'OK', 
          onPress: () => navigation.goBack()
        }]
      );
    } catch (error: any) {
      Alert.alert('Save Error', error.message || 'Failed to save cards');
    } finally {
      setIsSaving(false);
    }
  };

  const renderImageSelection = () => (
    <View style={styles.selectionContainer}>
      <Text style={styles.title}>Create Cards from Image</Text>
      <Text style={styles.subtitle}>
        Take a photo of your notes or textbook, and AI will generate flashcards
      </Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => pickImage('camera')}
      >
        <Ionicons name="camera" size={32} color="#6366F1" />
        <Text style={styles.optionText}>Take Photo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => pickImage('gallery')}
      >
        <Ionicons name="images" size={32} color="#6366F1" />
        <Text style={styles.optionText}>Choose from Gallery</Text>
      </TouchableOpacity>

      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>
          <Ionicons name="bulb-outline" size={16} color="#6366F1" /> Tips
        </Text>
        <Text style={styles.tipText}>• Ensure text is clear and well-lit</Text>
        <Text style={styles.tipText}>• Avoid shadows and glare</Text>
        <Text style={styles.tipText}>• Include complete sentences</Text>
      </View>
    </View>
  );

  const renderTextReview = () => (
    <ScrollView style={styles.reviewContainer}>
      <Text style={styles.title}>Review Extracted Text</Text>
      
      {image && (
        <Image source={{ uri: image }} style={styles.previewImage} />
      )}

      <View style={styles.textContainer}>
        <Text style={styles.extractedText}>{extractedText}</Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('options')}
      >
        <Text style={styles.primaryButtonText}>Next: Choose Options</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCardTypeSelection = () => (
    <View style={styles.cardTypesContainer}>
      <Text style={styles.sectionTitle}>Select Card Type</Text>
      {cardTypes.map((type) => (
        <TouchableOpacity
          key={type.id}
          style={[
            styles.cardTypeOption,
            selectedCardType === type.id && styles.selectedCardType,
            !type.available && styles.disabledCardType,
          ]}
          onPress={() => type.available && setSelectedCardType(type.id)}
          disabled={!type.available}
        >
          <View style={styles.cardTypeIcon}>
            <Ionicons
              name={type.icon}
              size={24}
              color={
                !type.available
                  ? '#ccc'
                  : selectedCardType === type.id
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
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptions = () => (
    <ScrollView style={styles.optionsContainer}>
      <Text style={styles.sectionTitle}>Generation Options</Text>
      
      {renderCardTypeSelection()}
      
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

      <View style={styles.extractedTextPreview}>
        <Text style={styles.optionLabel}>Extracted Text Preview</Text>
        <Text style={styles.extractedTextSmall}>
          {extractedText.substring(0, 200)}...
        </Text>
      </View>
    </ScrollView>
  );

  const renderPreview = () => (
    <ScrollView style={styles.previewContainer}>
      <Text style={styles.sectionTitle}>Generated Cards Preview</Text>
      {generatedCards.map((card, index) => {
        const flashcard = {
          id: `preview-${index}`,
          question: card.question,
          answer: card.answer,
          card_type: selectedCardType as 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'manual',
          options: card.options,
          correct_answer: card.correctAnswer,
          key_points: card.keyPoints,
          detailed_answer: card.detailedAnswer,
          box_number: 1,
          topic: topicName,
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
        <Text style={styles.headerTitle}>Generate from Image</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.topicInfo}>
        <Text style={styles.topicSubject}>{subjectName}</Text>
        <Text style={styles.topicName}>{topicName}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'select' && renderImageSelection()}
        {step === 'review' && !loading && renderTextReview()}
        {step === 'options' && renderOptions()}
        {step === 'preview' && renderPreview()}

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {step === 'review' ? 'Extracting text...' : 'Generating cards...'}
            </Text>
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
        {step === 'review' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setStep('options')}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}
        
        {step === 'options' && (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('review')}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={generateCardsFromText}
              disabled={loading || !selectedCardType}
            >
              <Text style={styles.primaryButtonText}>Generate</Text>
            </TouchableOpacity>
          </>
        )}
        
        {step === 'preview' && (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setGeneratedCards([]);
                setStep('options');
              }}
            >
              <Text style={styles.secondaryButtonText}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={saveCards}
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
  selectionContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
  },
  tipsContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
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
  reviewContainer: {
    flex: 1,
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  textContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  extractedText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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
  extractedTextPreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  extractedTextSmall: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  previewContainer: {
    flex: 1,
  },
  previewCardWrapper: {
    marginBottom: 16,
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
}); 