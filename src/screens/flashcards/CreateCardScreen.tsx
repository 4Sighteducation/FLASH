import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sanitizeTopicLabel } from '../../utils/topicNameUtils';

export default function CreateCardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { topicId, topicName, subjectName } = route.params as {
    topicId: string;
    topicName: string;
    subjectName: string;
  };

  return (
    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Flashcard</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.subjectLabel}>Subject</Text>
            <Text style={styles.subjectName}>{subjectName}</Text>
            <Text style={styles.topicLabel}>Topic</Text>
            <Text style={styles.topicName}>{sanitizeTopicLabel(topicName, { maxLength: 140 })}</Text>
          </View>

          <View style={styles.placeholderContainer}>
            <Ionicons name="flash-outline" size={64} color="#E0E7FF" />
            <Text style={styles.placeholderTitle}>Flashcard Creation</Text>
            <Text style={styles.placeholderText}>
              This feature is coming soon! You'll be able to create flashcards 
              for this topic with AI assistance or manually.
            </Text>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subjectLabel: {
    fontSize: 14,
    color: '#C7D2FE',
    marginBottom: 4,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  topicLabel: {
    fontSize: 14,
    color: '#C7D2FE',
    marginBottom: 4,
  },
  topicName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 22,
  },
}); 