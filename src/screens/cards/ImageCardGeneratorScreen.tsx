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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AIService } from '../../services/aiService';

export default function ImageCardGeneratorScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { topicId, topicName, subjectName, examBoard, examType } = route.params as any;

  const [image, setImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'review' | 'generate'>('select');
  const [selectedCardType, setSelectedCardType] = useState<'multiple_choice' | 'short_answer' | 'essay'>('short_answer');
  const [generatedCards, setGeneratedCards] = useState<any[]>([]);

  const pickImage = async (source: 'camera' | 'gallery') => {
    let result;
    
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      
      // Compress image if needed
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      setImage(manipulated.uri);
      await extractTextFromImage(manipulated.base64!);
    }
  };

  const extractTextFromImage = async (base64Image: string) => {
    setLoading(true);
    setStep('review');
    
    try {
      // Call your Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('vision-ocr', {
        body: { image: base64Image }
      });

      console.log('Edge Function Response:', { data, error });

      if (error) {
        console.error('Edge Function Error:', error);
        throw new Error(error.message || 'Edge Function error');
      }

      if (data && data.success && data.text) {
        setExtractedText(data.text);
      } else if (data && !data.success) {
        throw new Error(data.error || 'Failed to extract text');
      } else {
        throw new Error('No text found in image');
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      Alert.alert(
        'OCR Error', 
        error.message || 'Failed to extract text from image. Please try again.',
        [
          { text: 'OK', onPress: () => setStep('select') },
          { text: 'View Details', onPress: () => Alert.alert('Error Details', JSON.stringify(error, null, 2)) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const generateCardsFromText = async () => {
    if (!extractedText.trim()) {
      Alert.alert('Error', 'No text to generate cards from');
      return;
    }

    setLoading(true);
    setStep('generate');

    try {
      // Get user's API key
      const { data: apiData } = await supabase
        .from('api_settings')
        .select('openai_api_key')
        .eq('user_id', user?.id)
        .single();

      if (!apiData?.openai_api_key) {
        Alert.alert('API Key Required', 'Please set your OpenAI API key in settings');
        navigation.navigate('APISettings' as never);
        return;
      }

      // Generate cards using AI
      const aiService = new AIService();
      const cards = await aiService.generateCards({
        subject: subjectName,
        topic: topicName,
        examBoard,
        examType,
        questionType: selectedCardType,
        numCards: 5,
        contentGuidance: `Generate flashcards based on this content:\n\n${extractedText}`,
      });

      setGeneratedCards(cards);
    } catch (error: any) {
      console.error('Generation Error:', error);
      Alert.alert('Error', error.message || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const saveCards = async () => {
    setLoading(true);
    try {
      // Save all generated cards
      const cardsToInsert = generatedCards.map(card => ({
        ...card,
        user_id: user?.id,
        topic_id: topicId,
        subject_name: subjectName,
        topic: topicName,
        box_number: 1,
        is_ai_generated: true,
        source: 'image_ocr',
      }));

      const { error } = await supabase
        .from('flashcards')
        .insert(cardsToInsert);

      if (error) throw error;

      Alert.alert(
        'Success!', 
        `${generatedCards.length} flashcards created from your image!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Save Error:', error);
      Alert.alert('Error', 'Failed to save flashcards');
    } finally {
      setLoading(false);
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

      <View style={styles.cardTypeSelector}>
        <Text style={styles.label}>Card Type</Text>
        <View style={styles.cardTypeOptions}>
          {(['short_answer', 'multiple_choice', 'essay'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.cardTypeButton,
                selectedCardType === type && styles.selectedCardType
              ]}
              onPress={() => setSelectedCardType(type)}
            >
              <Text style={[
                styles.cardTypeText,
                selectedCardType === type && styles.selectedCardTypeText
              ]}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={generateCardsFromText}
        disabled={loading}
      >
        <Ionicons name="sparkles" size={20} color="#FFFFFF" />
        <Text style={styles.generateButtonText}>Generate Flashcards</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderGeneratedCards = () => (
    <ScrollView style={styles.cardsContainer}>
      <Text style={styles.title}>Generated Flashcards</Text>
      <Text style={styles.subtitle}>{generatedCards.length} cards created</Text>

      {generatedCards.map((card, index) => (
        <View key={index} style={styles.cardPreview}>
          <Text style={styles.cardQuestion}>Q: {card.question}</Text>
          <Text style={styles.cardAnswer}>A: {card.answer}</Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveCards}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>Save All Cards</Text>
      </TouchableOpacity>
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

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            {step === 'review' ? 'Extracting text...' : 'Generating cards...'}
          </Text>
        </View>
      )}

      {step === 'select' && renderImageSelection()}
      {step === 'review' && !loading && renderTextReview()}
      {step === 'generate' && !loading && renderGeneratedCards()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  cardTypeSelector: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  cardTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  cardTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  selectedCardType: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  cardTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedCardTypeText: {
    color: '#FFFFFF',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardsContainer: {
    flex: 1,
    padding: 20,
  },
  cardPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardAnswer: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
}); 