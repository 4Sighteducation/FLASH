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
import { sanitizeTopicLabel } from '../utils/topicNameUtils';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to strip exam type from subject name
const stripExamType = (subjectName: string): string => {
  const cleaned = sanitizeTopicLabel(subjectName, { maxLength: 140 });
  // Remove common exam type patterns like "(A-Level)", "(GCSE)", etc.
  return cleaned.replace(/\s*\([^)]*\)\s*$/, '').trim();
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
  allowFlip?: boolean;
  variant?: 'default' | 'studyHero';
  difficultyModeLabel?: 'safe' | 'standard' | 'turbo' | 'overdrive' | 'beast';
  onRevealDisabled?: (difficulty: string) => void;
}

export default function FrozenCard({
  card,
  color,
  preview = false,
  allowFlip = true,
  variant = 'default',
  difficultyModeLabel,
  onRevealDisabled,
}: FrozenCardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const isFlipDisabled = !allowFlip;
  
  // If preview mode, act like a flippable flashcard (read-only)
  if (preview) {
    const canFlip = !!allowFlip;
    return (
      <View style={[
        styles.container,
        variant === 'studyHero' && styles.containerStudyHero,
        { borderColor: color }
      ]}>
        <TouchableOpacity 
          style={[styles.previewCard, variant === 'studyHero' && styles.previewCardStudyHero]}
          onPress={
            canFlip
              ? () => setIsFlipped(!isFlipped)
              : () => {
                  if (isFlipDisabled && onRevealDisabled) {
                    onRevealDisabled(difficultyModeLabel || 'turbo');
                  }
                }
          }
          activeOpacity={0.9}
          disabled={false}
        >
          {!canFlip ? (
            <View pointerEvents="none" style={styles.previewLockedOverlay}>
              <View style={styles.previewLockedBadge}>
                <Icon name="lock-closed" size={18} color="#111827" />
                <Text style={styles.previewLockedText}>Locked</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.previewBadge}>
            <Icon name="eye-outline" size={16} color="#6366F1" />
            <Text style={styles.previewBadgeText}>Preview Only</Text>
          </View>
          
          {card.topic && (
            <Text style={[
              styles.topicLabel,
              variant === 'studyHero' && styles.topicLabelStudyHero,
              { color }
            ]}>
              {stripExamType(card.topic)}
            </Text>
          )}
          
          {!isFlipped ? (
            <>
              <View style={[styles.questionBox, variant === 'studyHero' && styles.questionBoxStudyHero]}>
                <Text style={[styles.question, variant === 'studyHero' && styles.questionStudyHero]}>
                  {card.question}
                </Text>
              </View>
              {canFlip ? (
                <Text style={[styles.tapToFlip, variant === 'studyHero' && styles.tapToFlipStudyHero]}>Tap to see answer</Text>
              ) : (
              <Text style={[styles.tapToFlip, variant === 'studyHero' && styles.tapToFlipStudyHero]}>
                Answer locked in Turbo+
              </Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.answerLabel, variant === 'studyHero' && styles.answerLabelStudyHero]}>Answer:</Text>
              <Text style={[styles.answer, variant === 'studyHero' && styles.answerStudyHero]}>
                {card.answer || 'No answer available'}
              </Text>
              <Text style={[styles.tapToFlip, variant === 'studyHero' && styles.tapToFlipStudyHero]}>Tap to flip back</Text>
            </>
          )}
          
          <View style={[styles.boxIndicator, variant === 'studyHero' && styles.boxIndicatorStudyHero, { backgroundColor: color + '20' }]}>
            <Text style={[styles.boxText, variant === 'studyHero' && styles.boxTextStudyHero, { color }]}>Available Tomorrow</Text>
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
    <View style={[
      styles.container,
      variant === 'studyHero' && styles.containerStudyHero,
      { borderColor: color }
    ]}>
      {/* Locked badge (visual only; don't hide the question) */}
      <View pointerEvents="none" style={styles.lockBadge}>
        <Icon name="lock-closed" size={28} color="#111827" />
      </View>

      {/* Card Content */}
      <TouchableOpacity
        activeOpacity={allowFlip ? 0.9 : 1}
        onPress={() => {
          if (!allowFlip && onRevealDisabled) {
            onRevealDisabled(difficultyModeLabel || 'turbo');
            return;
          }
          if (allowFlip) {
            setIsFlipped((v) => !v);
          }
        }}
        disabled={false}
        style={[styles.cardContent, allowFlip && styles.cardContentFlippable]}
      >
        {card.topic && (
          <Text style={[
            styles.topicLabel,
            variant === 'studyHero' && styles.topicLabelStudyHero,
            { color }
          ]}>
            {stripExamType(card.topic)}
          </Text>
        )}
        
        {!isFlipped ? (
          <Text
            style={[styles.question, variant === 'studyHero' && styles.questionStudyHero]}
            numberOfLines={6}
          >
            {card.question}
          </Text>
        ) : (
          <>
            <Text style={[styles.answerLabel, variant === 'studyHero' && styles.answerLabelStudyHero]}>Answer:</Text>
            <Text style={[styles.answer, variant === 'studyHero' && styles.answerStudyHero]}>
              {card.answer || 'No answer available'}
            </Text>
          </>
        )}

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
      </TouchableOpacity>
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
  containerStudyHero: {
    width: '100%',
    flex: 1,
    marginVertical: 0,
    alignSelf: 'stretch',
    backgroundColor: '#0a0f1e',
    borderRadius: 24,
    borderWidth: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    opacity: 0.7,
  },
  cardContentFlippable: {
    opacity: 1,
  },
  topicLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  topicLabelStudyHero: {
    textTransform: 'none',
    color: '#E5E7EB',
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    lineHeight: 24,
  },
  questionStudyHero: {
    color: '#FFFFFF',
    marginBottom: 0,
    lineHeight: 26,
    fontWeight: '800',
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
  previewCardStudyHero: {
    padding: 18,
    justifyContent: 'flex-start',
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
  questionBox: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 14,
  },
  questionBoxStudyHero: {
    marginTop: 16,
  },
  answer: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  answerStudyHero: {
    color: '#E5E7EB',
  },
  answerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  answerLabelStudyHero: {
    color: '#9CA3AF',
  },
  tapToFlip: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  tapToFlipStudyHero: {
    color: 'rgba(255,255,255,0.55)',
  },
  previewLockedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 24,
    zIndex: 9,
  },
  previewLockedBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.10)',
  },
  previewLockedText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  boxIndicatorStudyHero: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  boxTextStudyHero: {
    fontWeight: '800',
  },
}); 