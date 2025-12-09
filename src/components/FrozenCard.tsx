import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to strip exam type from subject name
const stripExamType = (subjectName: string): string => {
  // Remove common exam type patterns like "(A-Level)", "(GCSE)", etc.
  return subjectName.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

interface FrozenCardProps {
  card: {
    id: string;
    question: string;
    answer?: string;
    box_number: number;
    topic?: string;
    next_review_date: string;
    daysUntilReview?: number;
  };
  color: string;
  preview?: boolean;
}

export default function FrozenCard({ card, color, preview = false }: FrozenCardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);
  
  // If preview mode, act like a flippable flashcard (read-only)
  if (preview) {
    return (
      <View style={[styles.container, { borderColor: color }]}>
        <TouchableOpacity 
          style={styles.previewCard}
          onPress={() => setIsFlipped(!isFlipped)}
          activeOpacity={0.9}
        >
          <View style={styles.previewBadge}>
            <Icon name="eye-outline" size={16} color="#6366F1" />
            <Text style={styles.previewBadgeText}>Preview Only</Text>
          </View>
          
          {card.topic && (
            <Text style={[styles.topicLabel, { color }]}>{stripExamType(card.topic)}</Text>
          )}
          
          {!isFlipped ? (
            <>
              <Text style={styles.question}>{card.question}</Text>
              <Text style={styles.tapToFlip}>Tap to see answer</Text>
            </>
          ) : (
            <>
              <Text style={styles.answerLabel}>Answer:</Text>
              <Text style={styles.answer}>{card.answer || 'No answer available'}</Text>
              <Text style={styles.tapToFlip}>Tap to flip back</Text>
            </>
          )}
          
          <View style={[styles.boxIndicator, { backgroundColor: color + '20' }]}>
            <Text style={[styles.boxText, { color }]}>Available Tomorrow</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Normal frozen card display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getDaysText = (days?: number) => {
    if (!days || days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <View style={[styles.container, { borderColor: color }]}>
      {/* Frozen Overlay */}
      <View style={styles.frozenOverlay}>
        <Icon name="lock-closed" size={40} color="#999" />
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {card.topic && (
          <Text style={[styles.topicLabel, { color }]}>{stripExamType(card.topic)}</Text>
        )}
        
        <Text style={styles.question} numberOfLines={6}>
          {card.question}
        </Text>

        {/* Frozen Status */}
        <View style={styles.frozenStatus}>
          <Icon name="time-outline" size={20} color="#666" />
          <Text style={styles.frozenText}>
            This card is not ready for review
          </Text>
        </View>

        {/* Next Review Date */}
        <View style={styles.nextReviewContainer}>
          <Text style={styles.nextReviewLabel}>Next review:</Text>
          <Text style={styles.nextReviewDate}>
            {getDaysText(card.daysUntilReview)} • {formatDate(card.next_review_date)}
          </Text>
        </View>

        {/* Box Indicator */}
        <View style={[styles.boxIndicator, { backgroundColor: color + '20' }]}>
          <Text style={[styles.boxText, { color }]}>Box {card.box_number}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth - 32,
    height: 420,
    marginVertical: 8,
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  frozenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    opacity: 0.7,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  frozenStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  frozenText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  nextReviewContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  nextReviewLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  nextReviewDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  boxIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  boxText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewCard: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  previewBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  answer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  tapToFlip: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
}); 