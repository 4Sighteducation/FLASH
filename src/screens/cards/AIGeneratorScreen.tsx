import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AIService, CardGenerationParams, GeneratedCard } from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import FlashcardCard from '../../components/FlashcardCard';
import { abbreviateTopicName } from '../../utils/topicNameUtils';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { subject, topic, topicId, examBoard, examType, isOverviewCard, childrenTopics } = route.params as any;

  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [numCards, setNumCards] = useState('5');
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'options' | 'preview'>('select');
  const [aiService] = useState(() => new AIService());
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Simulate progress during generation
  useEffect(() => {
    if (isGenerating) {
      setGenerationProgress(0);
      setGenerationStatus('Initializing AI...');
      
      // Start glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      const statusMessages = [
        { progress: 10, message: 'Connecting to AI...' },
        { progress: 25, message: 'Analyzing topic...' },
        { progress: 40, message: 'Generating questions...' },
        { progress: 60, message: 'Crafting answers...' },
        { progress: 75, message: 'Adding detailed explanations...' },
        { progress: 85, message: 'Validating content...' },
        { progress: 95, message: 'Almost done...' },
      ];

      statusMessages.forEach((status, index) => {
        setTimeout(() => {
          if (isGenerating) {
            setGenerationProgress(status.progress);
            setGenerationStatus(status.message);
            Animated.timing(progressAnim, {
              toValue: status.progress,
              duration: 500,
              useNativeDriver: false,
            }).start();
          }
        }, index * 2000);
      });
    } else {
      glowAnim.stopAnimation();
      setGenerationProgress(0);
    }
  }, [isGenerating]);

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
        isOverview: isOverviewCard || false, // Pass overview flag
        childrenTopics: childrenTopics || [], // Pass children topics for overview cards
      };

      console.log('🎨 Generating cards with full params:', {
        subject,
        topic,
        examBoard,
        examType,
        questionType: selectedType,
        numCards: parseInt(numCards, 10),
        topicId,
        isOverview: isOverviewCard || false,
        childrenTopics: childrenTopics || [],
      });

      const cards = await aiService.generateCards(params);
      
      // Validate cards were generated properly
      const validCards = cards.filter(card => 
        card.question && 
        card.question !== 'No question generated' &&
        card.question.length > 10
      );
      
      if (validCards.length === 0) {
        // All cards failed
        Alert.alert(
          'Oops! 😅',
          `Sorry, we couldn't create any flashcards that time. This occasionally happens with AI.\n\nPlease try:\n• Generating fewer cards (try 3 instead of ${numCards})\n• A different card type\n• Simplifying the topic name`,
          [{ text: 'Try Again', onPress: () => setCurrentStep('options') }]
        );
        setIsGenerating(false);
        return;
      } else if (validCards.length < cards.length) {
        // Some cards failed
        Alert.alert(
          'Partial Success',
          `Created ${validCards.length} out of ${cards.length} cards. Some failed to generate properly.`,
          [{ text: 'OK' }]
        );
      }
      
      // Complete animation
      setGenerationProgress(100);
      setGenerationStatus('Complete! ✨');
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      // Small delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGeneratedCards(validCards);
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

    console.log('✅ Auto-saving to study bank...');
    // Auto-save to study bank (removed popup)
    saveCards(true);
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

      // Success alert - simple and clear
      Alert.alert(
        'Success! ✅',
        `${generatedCards.length} cards saved and ready to study!`,
        [{ 
          text: 'OK', 
          onPress: () => {
            // Reset navigation stack and go to Home
            (navigation as any).reset({
              index: 0,
              routes: [{ name: 'HomeMain' }],
            });
          }
        }]
      );
    } catch (error: any) {
      Alert.alert('Save Error ❌', error.message || 'Failed to save cards');
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
          returnKeyType="done"
          blurOnSubmit={true}
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

  const handleDeletePreviewCard = (index: number) => {
    const newCards = generatedCards.filter((_, i) => i !== index);
    setGeneratedCards(newCards);
    if (newCards.length === 0) {
      Alert.alert('No Cards Left', 'All cards deleted. Generate new ones?', [
        { text: 'Cancel', onPress: () => setCurrentStep('options') },
        { text: 'Regenerate', onPress: handleGenerateCards }
      ]);
    }
  };

  const renderPreview = () => (
    <ScrollView style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.sectionTitle}>Generated Cards Preview</Text>
        <Text style={styles.previewCount}>{generatedCards.length} cards</Text>
      </View>
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
            <TouchableOpacity
              style={styles.deletePreviewButton}
              onPress={() => handleDeletePreviewCard(index)}
            >
              <Text style={styles.deletePreviewText}>✕</Text>
            </TouchableOpacity>
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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>
            {isOverviewCard ? '🏔️ Overview Cards' : 'AI Card Generator'}
          </Text>
          {isOverviewCard && childrenTopics && childrenTopics.length > 0 && (
            <Text style={styles.overviewSubtitle}>
              Comparing {childrenTopics.length} subtopics
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.topicInfo}>
        <Text style={styles.topicSubject}>{subject}</Text>
        <Text style={styles.topicName} numberOfLines={2}>
          {abbreviateTopicName(topic)}
        </Text>
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
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.95)', 'rgba(0, 20, 40, 0.95)', 'rgba(0, 0, 0, 0.95)']}
              style={styles.progressContainer}
            >
              {/* Cyber Grid Background */}
              <View style={styles.cyberGrid} />
              
              {/* Main Content */}
              <View style={styles.progressContent}>
                {/* AI Brain Icon */}
                <View style={styles.aiIconContainer}>
                  <Animated.View
                    style={[
                      styles.aiIconGlow,
                      {
                        opacity: glowAnim,
                        transform: [{
                          scale: glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.2],
                          }),
                        }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['#00D4FF', '#0088FF', '#00D4FF']}
                      style={styles.aiIconGradient}
                    >
                      <Text style={styles.aiIconText}>🧠</Text>
                    </LinearGradient>
                  </Animated.View>
                </View>

                {/* Status Text */}
                <Text style={styles.loadingTitle}>AI Generation In Progress</Text>
                <Text style={styles.loadingStatus}>{generationStatus}</Text>

                {/* Progress Bar Container */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={['#00D4FF', '#0088FF', '#00FFAA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.progressGradient}
                      />
                    </Animated.View>
                    
                    {/* Animated Scanner Line */}
                    <Animated.View
                      style={[
                        styles.scannerLine,
                        {
                          opacity: glowAnim,
                        },
                      ]}
                    />
                  </View>
                  
                  {/* Progress Text */}
                  <Text style={styles.progressText}>{generationProgress}%</Text>
                </View>

                {/* Decorative Elements */}
                <View style={styles.decorativeContainer}>
                  <View style={styles.decorativeLine} />
                  <Text style={styles.decorativeText}>◇ PROCESSING ◇</Text>
                  <View style={styles.decorativeLine} />
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {isSaving && (
          <View style={styles.loadingOverlay}>
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.95)', 'rgba(0, 40, 20, 0.95)', 'rgba(0, 0, 0, 0.95)']}
              style={styles.progressContainer}
            >
              <ActivityIndicator size="large" color="#00FFAA" />
              <Text style={styles.loadingTitle}>Saving Cards</Text>
              <Text style={styles.loadingStatus}>Storing your flashcards...</Text>
            </LinearGradient>
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
        
        {currentStep === 'preview' && generatedCards.length > 0 && (
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
              <Text style={styles.primaryButtonText}>Save {generatedCards.length} Card{generatedCards.length !== 1 ? 's' : ''}</Text>
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
  overviewSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    width: '90%',
    maxWidth: 400,
    padding: 30,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cyberGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    backgroundColor: 'transparent',
  },
  progressContent: {
    alignItems: 'center',
  },
  aiIconContainer: {
    marginBottom: 20,
  },
  aiIconGlow: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  aiIconText: {
    fontSize: 40,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#00D4FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  loadingStatus: {
    fontSize: 14,
    color: '#00FFAA',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressGradient: {
    flex: 1,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  scannerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 2,
  },
  progressText: {
    fontSize: 16,
    color: '#00D4FF',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  decorativeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  decorativeLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
  },
  decorativeText: {
    fontSize: 10,
    color: 'rgba(0, 212, 255, 0.6)',
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24, // Extra padding for mobile safe area
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
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
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewCount: {
    fontSize: 14,
    color: '#00D4FF',
    fontWeight: '600',
  },
  previewCardWrapper: {
    padding: 16,
    position: 'relative',
  },
  deletePreviewButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  deletePreviewText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 