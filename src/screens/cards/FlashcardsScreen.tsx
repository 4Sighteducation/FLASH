import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import FlashcardCard from '../../components/FlashcardCard';

interface Flashcard {
  id: string;
  question: string;
  answer?: string;
  card_type: 'multiple_choice' | 'short_answer' | 'essay' | 'acronym' | 'manual';
  options?: string[];
  correct_answer?: string;
  key_points?: string[];
  detailed_answer?: string;
  box_number: number;
  subject_name?: string;
  topic?: string;
  next_review_date: string;
}

export default function FlashcardsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { subjectName, subjectColor } = route.params as any;
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'due'>('all');

  useEffect(() => {
    fetchFlashcards();
  }, [filter]);

  const fetchFlashcards = async () => {
    try {
      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user?.id)
        .eq('subject_name', subjectName)
        .order('created_at', { ascending: false });

      if (filter === 'due') {
        query = query.lte('next_review_date', new Date().toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setFlashcards(data || []);
    } catch (error) {
      console.error('Error fetching flashcards:', error);
      Alert.alert('Error', 'Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('flashcards')
                .delete()
                .eq('id', cardId);

              if (error) throw error;
              
              setFlashcards(flashcards.filter(card => card.id !== cardId));
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete card');
            }
          },
        },
      ]
    );
  };

  const handleCardAnswer = async (cardId: string, correct: boolean) => {
    try {
      const card = flashcards.find(c => c.id === cardId);
      if (!card) return;

      // Update box number based on answer (Leitner system)
      const newBoxNumber = correct 
        ? Math.min(card.box_number + 1, 5) 
        : 1;

      // Calculate next review date based on box number
      const daysUntilReview = [1, 3, 7, 14, 30][newBoxNumber - 1];
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview);

      const { error } = await supabase
        .from('flashcards')
        .update({
          box_number: newBoxNumber,
          next_review_date: nextReviewDate.toISOString(),
        })
        .eq('id', cardId);

      if (error) throw error;

      // Update local state
      setFlashcards(flashcards.map(c => 
        c.id === cardId 
          ? { ...c, box_number: newBoxNumber, next_review_date: nextReviewDate.toISOString() }
          : c
      ));
    } catch (error) {
      console.error('Error updating card:', error);
    }
  };

  const getStats = () => {
    const total = flashcards.length;
    const due = flashcards.filter(card => 
      new Date(card.next_review_date) <= new Date()
    ).length;
    const mastered = flashcards.filter(card => card.box_number === 5).length;
    
    return { total, due, mastered };
  };

  const stats = getStats();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={subjectColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subjectName} Flashcards</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Study', { subjectName, subjectColor })}>
          <Ionicons name="play-circle" size={28} color={subjectColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: subjectColor }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Cards</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FF9500' }]}>{stats.due}</Text>
          <Text style={styles.statLabel}>Due for Review</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#FFD700' }]}>{stats.mastered}</Text>
          <Text style={styles.statLabel}>Mastered</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All Cards
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'due' && styles.activeFilter]}
          onPress={() => setFilter('due')}
        >
          <Text style={[styles.filterText, filter === 'due' && styles.activeFilterText]}>
            Due Only
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.cardsContainer} showsVerticalScrollIndicator={false}>
        {flashcards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {filter === 'due' ? 'No cards due for review!' : 'No flashcards yet'}
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: subjectColor }]}
              onPress={() => navigation.navigate('AIGenerator', { 
                subject: subjectName,
                topic: 'General',
                examBoard: route.params?.examBoard || 'AQA',
                examType: route.params?.examType || 'GCSE',
              })}
            >
              <Text style={styles.createButtonText}>Create Flashcards</Text>
            </TouchableOpacity>
          </View>
        ) : (
          flashcards.map((card) => (
            <FlashcardCard
              key={card.id}
              card={card}
              color={subjectColor}
              onAnswer={(correct) => handleCardAnswer(card.id, correct)}
              showDeleteButton
              onDelete={() => handleDeleteCard(card.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#6366F1',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
}); 