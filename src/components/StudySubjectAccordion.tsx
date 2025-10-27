import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface SubjectBoxStats {
  subjectName: string;
  subjectColor: string;
  totalCards: number;
  dueCards: number;
  frozenCards: number;
  boxCounts: {
    box1: number;
    box2: number;
    box3: number;
    box4: number;
    box5: number;
  };
  topics: {
    topicName: string;
    cardCount: number;
    dueCount: number;
  }[];
}

interface StudySubjectAccordionProps {
  boxNumber?: number;
  onSubjectStudy: (subjectName: string, subjectColor: string, boxNumber?: number) => void;
  onTopicStudy: (subjectName: string, topicName: string, subjectColor: string, boxNumber?: number) => void;
}

export default function StudySubjectAccordion({ 
  boxNumber, 
  onSubjectStudy, 
  onTopicStudy 
}: StudySubjectAccordionProps) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectBoxStats[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSubjectStats();
  }, [boxNumber]);

  const fetchSubjectStats = async () => {
    try {
      setLoading(true);
      
      // Get user's active subjects
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          subject_id,
          color,
          subject:exam_board_subjects!subject_id(subject_name)
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;

      const subjectStats: SubjectBoxStats[] = [];
      const now = new Date();

      for (const userSubject of userSubjects || []) {
        const subjectName = (userSubject as any).subject.subject_name;
        
        // Get all cards for this subject in study bank
        let query = supabase
          .from('flashcards')
          .select('*')
          .eq('user_id', user?.id)
          .eq('subject_name', subjectName)
          .eq('in_study_bank', true);

        // If specific box number, filter by it
        if (boxNumber) {
          query = query.eq('box_number', boxNumber);
        }

        const { data: cards, error: cardsError } = await query;
        if (cardsError) throw cardsError;

        if (!cards || cards.length === 0) continue;

        // Calculate stats
        const boxCounts = {
          box1: 0,
          box2: 0,
          box3: 0,
          box4: 0,
          box5: 0,
        };

        let dueCards = 0;
        let frozenCards = 0;
        const topicStats: { [key: string]: { cardCount: number; dueCount: number } } = {};

        cards.forEach(card => {
          // Count by box
          const boxKey = `box${card.box_number}` as keyof typeof boxCounts;
          boxCounts[boxKey]++;

          // Check if due
          const reviewDate = new Date(card.next_review_date);
          if (reviewDate <= now) {
            dueCards++;
          } else {
            frozenCards++;
          }

          // Group by topic
          const topic = card.topic || 'General';
          if (!topicStats[topic]) {
            topicStats[topic] = { cardCount: 0, dueCount: 0 };
          }
          topicStats[topic].cardCount++;
          if (reviewDate <= now) {
            topicStats[topic].dueCount++;
          }
        });

        // Convert topic stats to array
        const topics = Object.entries(topicStats).map(([topicName, stats]) => ({
          topicName,
          ...stats,
        }));

        subjectStats.push({
          subjectName,
          subjectColor: userSubject.color || '#6366F1',
          totalCards: cards.length,
          dueCards,
          frozenCards,
          boxCounts,
          topics,
        });
      }

      setSubjects(subjectStats);
    } catch (error) {
      console.error('Error fetching subject stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectName: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectName)) {
      newExpanded.delete(subjectName);
    } else {
      newExpanded.add(subjectName);
    }
    setExpandedSubjects(newExpanded);
  };

  const isAllFrozen = (subject: SubjectBoxStats) => {
    return subject.dueCards === 0 && subject.totalCards > 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="school-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>
          {boxNumber 
            ? `No cards in Box ${boxNumber}` 
            : 'No cards in study bank'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {subjects.map((subject) => {
        const isExpanded = expandedSubjects.has(subject.subjectName);
        const allFrozen = isAllFrozen(subject);

        return (
          <View key={subject.subjectName} style={styles.subjectContainer}>
            <TouchableOpacity
              style={[
                styles.subjectHeader,
                { borderLeftColor: subject.subjectColor },
                allFrozen && styles.frozenHeader,
              ]}
              onPress={() => toggleSubject(subject.subjectName)}
            >
              <View style={styles.subjectInfo}>
                <Text style={[styles.subjectName, allFrozen && styles.frozenText]}>
                  {subject.subjectName}
                </Text>
                <View style={styles.statsRow}>
                  <Text style={[styles.statText, allFrozen && styles.frozenText]}>
                    {subject.totalCards} cards
                  </Text>
                  {subject.dueCards > 0 && (
                    <Text style={[styles.dueText, { color: subject.subjectColor }]}>
                      • {subject.dueCards} due
                    </Text>
                  )}
                  {allFrozen && (
                    <View style={styles.frozenBadge}>
                      <Icon name="lock-closed" size={12} color="#999" />
                      <Text style={styles.frozenBadgeText}>All reviewed</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.subjectActions}>
                {!allFrozen && (
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: subject.subjectColor }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      onSubjectStudy(subject.subjectName, subject.subjectColor, boxNumber);
                    }}
                  >
                    <Icon name="play" size={16} color="white" />
                  </TouchableOpacity>
                )}
                <Ionicons 
                  name={isExpanded ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={allFrozen ? "#999" : "#666"} 
                />
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.topicsContainer}>
                {subject.topics.map((topic) => (
                  <TouchableOpacity
                    key={topic.topicName}
                    style={styles.topicItem}
                    onPress={() => onTopicStudy(
                      subject.subjectName, 
                      topic.topicName, 
                      subject.subjectColor, 
                      boxNumber
                    )}
                  >
                    <Text style={styles.topicName}>{topic.topicName}</Text>
                    <View style={styles.topicStats}>
                      <Text style={styles.topicCardCount}>{topic.cardCount} cards</Text>
                      {topic.dueCount > 0 && (
                        <Text style={[styles.topicDueCount, { color: subject.subjectColor }]}>
                          {topic.dueCount} due
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  subjectContainer: {
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 4,
  },
  frozenHeader: {
    backgroundColor: '#f9f9f9',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  frozenText: {
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  dueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  frozenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  frozenBadgeText: {
    fontSize: 12,
    color: '#999',
  },
  subjectActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  topicsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topicName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  topicStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicCardCount: {
    fontSize: 14,
    color: '#666',
  },
  topicDueCount: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 