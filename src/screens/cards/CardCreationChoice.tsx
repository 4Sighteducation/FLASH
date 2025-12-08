import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/Icon';

interface CardCreationChoiceProps {
  navigation: any;
  route: any;
}

export default function CardCreationChoice({ navigation, route }: CardCreationChoiceProps) {
  const { 
    topicId, 
    topicName, 
    subjectName, 
    examBoard, 
    examType,
    // Discovery metadata (from SmartTopicDiscovery)
    discoveryMethod,
    searchQuery,
    subjectId
  } = route.params as any;

  const handleAICreate = () => {
    console.log('🎨 Navigating to AIGenerator with params:', {
      subject: subjectName,
      topic: topicName,
      topicId,
      examBoard,
      examType,
      subjectId,
      discoveryMethod,
      searchQuery
    });
    
    navigation.replace('AIGenerator', {
      subject: subjectName,
      topic: topicName,
      topicId,
      examBoard,
      examType,
      // Pass through discovery metadata
      subjectId,
      discoveryMethod,
      searchQuery,
    });
  };

  const handleManualCreate = () => {
    navigation.replace('CreateCard', {
      topicId,
      topicName,
      subjectName,
    });
  };

  const handleImageCreate = () => {
    navigation.replace('ImageCardGenerator', {
      topicId,
      topicName,
      subjectName,
      examBoard,
      examType,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Flashcards</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.topicName}>{topicName}</Text>
        <Text style={styles.subtitle}>No flashcards exist for this topic yet</Text>
        <Text style={styles.question}>How would you like to create flashcards?</Text>

        <TouchableOpacity style={styles.optionCard} onPress={handleAICreate}>
          <View style={[styles.iconContainer, { backgroundColor: '#FFF3CD' }]}>
            <Icon name="flash" size={32} color="#FFD700" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>AI Generated</Text>
            <Text style={styles.optionDescription}>
              Let AI create exam-specific flashcards based on your curriculum
            </Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={handleManualCreate}>
          <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="create-outline" size={32} color="#2196F3" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Create Manually</Text>
            <Text style={styles.optionDescription}>
              Write your own custom flashcards for this topic
            </Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={handleImageCreate}>
          <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="camera" size={32} color="#4CAF50" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>From Image</Text>
            <Text style={styles.optionDescription}>
              Take a photo of notes or textbook and generate cards with AI
            </Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
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
  content: {
    flex: 1,
    padding: 20,
  },
  topicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
}); 