import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from './ThemeContext';
import {
  usePulseAnimation,
  usePressAnimation,
  useFadeIn,
  useGlowAnimation,
  useHeartbeatAnimation,
} from './useAnimations';

// ============================================================================
// THEMED CARD COMPONENT
// ============================================================================

interface ThemedCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  glowing?: boolean;
  style?: ViewStyle;
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  elevated = false,
  glowing = false,
  style,
}) => {
  const { colors, effects, themeMode } = useTheme();
  const pulseAnim = usePulseAnimation(glowing);
  const glowAnim = useGlowAnimation(glowing);

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.surfaceElevated : colors.surface,
    borderRadius: effects.radiusLarge,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...effects.shadow[elevated ? 'medium' : 'small'],
  };

  return (
    <Animated.View style={[cardStyle, pulseAnim, style]}>
      {/* Optional glow overlay for premium themes */}
      {glowing && (themeMode === 'aurora' || themeMode === 'singularity') && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: effects.radiusLarge,
              borderWidth: 2,
              borderColor: colors.glowPrimary,
              opacity: glowAnim.opacity,
            },
          ]}
          pointerEvents="none"
        />
      )}
      {children}
    </Animated.View>
  );
};

// ============================================================================
// THEMED BUTTON COMPONENT
// ============================================================================

interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
}) => {
  const { colors, effects, themeMode } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 },
    medium: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 15 },
    large: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 17 },
  };

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: themeMode === 'pulse' ? effects.radiusFull : effects.radiusMedium,
      paddingVertical: sizeStyles[size].paddingVertical,
      paddingHorizontal: sizeStyles[size].paddingHorizontal,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: colors.primary,
          ...effects.shadow.glow,
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: colors.primary,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
        };
      default:
        return base;
    }
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontSize: sizeStyles[size].fontSize,
      fontWeight: '600',
    };

    switch (variant) {
      case 'primary':
        return { ...base, color: colors.textOnPrimary };
      case 'secondary':
      case 'ghost':
        return { ...base, color: colors.primary };
      default:
        return base;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Animated.View style={[getButtonStyle(), animatedStyle, style]}>
        <Text style={getTextStyle()}>{title}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// THEMED PROGRESS BAR
// ============================================================================

interface ThemedProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  label?: string;
  style?: ViewStyle;
}

export const ThemedProgressBar: React.FC<ThemedProgressBarProps> = ({
  progress,
  showLabel = true,
  label = 'Progress',
  style,
}) => {
  const { colors, effects, themeMode } = useTheme();
  const glowAnim = useGlowAnimation(themeMode === 'singularity');

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <View style={style}>
      {showLabel && (
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {label}
          </Text>
          <Text style={[styles.progressValue, { color: colors.primary }]}>
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: `${colors.primary}20`,
            borderRadius: effects.radiusFull,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: colors.primary,
              borderRadius: effects.radiusFull,
              ...effects.shadow.glow,
            },
            themeMode === 'singularity' && { opacity: glowAnim.opacity },
          ]}
        />
      </View>
    </View>
  );
};

// ============================================================================
// THEMED BADGE / XP INDICATOR
// ============================================================================

interface ThemedBadgeProps {
  value: string | number;
  icon?: string;
  style?: ViewStyle;
}

export const ThemedBadge: React.FC<ThemedBadgeProps> = ({ value, icon = '⚡', style }) => {
  const { colors, effects, themeMode } = useTheme();
  const heartbeat = useHeartbeatAnimation(themeMode === 'pulse');
  const pulse = usePulseAnimation(themeMode === 'singularity');

  const animStyle = themeMode === 'pulse' ? heartbeat : themeMode === 'singularity' ? pulse : {};

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: colors.surface,
          borderRadius: effects.radiusFull,
          borderWidth: 1,
          borderColor: colors.border,
          ...effects.shadow.small,
        },
        animStyle,
        style,
      ]}
    >
      <Text style={styles.badgeIcon}>{icon}</Text>
      <Text style={[styles.badgeValue, { color: colors.primary }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
    </Animated.View>
  );
};

// ============================================================================
// THEMED FLASHCARD COMPONENT
// ============================================================================

interface FlashcardProps {
  question: string;
  subject?: string;
  cardNumber?: number;
  totalCards?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ThemedFlashcard: React.FC<FlashcardProps> = ({
  question,
  subject,
  cardNumber,
  totalCards,
  onPress,
  style,
}) => {
  const { colors, effects, themeMode } = useTheme();
  const fadeIn = useFadeIn(0);
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation();
  const glowAnim = useGlowAnimation(themeMode === 'aurora' || themeMode === 'singularity');

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.flashcard,
          {
            backgroundColor: colors.surface,
            borderRadius: effects.radiusXLarge,
            borderWidth: 1,
            borderColor: colors.border,
            ...effects.shadow.medium,
          },
          fadeIn,
          animatedStyle,
          style,
        ]}
      >
        {/* Glow border for premium themes */}
        {(themeMode === 'aurora' || themeMode === 'singularity') && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: effects.radiusXLarge,
                borderWidth: 2,
                borderColor: colors.glowPrimary,
                opacity: glowAnim.opacity,
              },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Card header */}
        {(subject || cardNumber) && (
          <Text style={[styles.flashcardMeta, { color: colors.textMuted }]}>
            {subject && `${subject}`}
            {subject && cardNumber && ' • '}
            {cardNumber && totalCards && `Card ${cardNumber} of ${totalCards}`}
          </Text>
        )}

        {/* Question */}
        <Text style={[styles.flashcardQuestion, { color: colors.text }]}>
          {question}
        </Text>

        {/* Tap hint */}
        <View
          style={[
            styles.flashcardHint,
            {
              backgroundColor: `${colors.primary}15`,
              borderRadius: effects.radiusMedium,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Text style={[styles.flashcardHintText, { color: colors.primary }]}>
            Tap to reveal answer
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================================================
// THEMED SECTION HEADER
// ============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export const ThemedSectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Progress bar
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Flashcard
  flashcard: {
    padding: 24,
    minHeight: 200,
  },
  flashcardMeta: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  flashcardQuestion: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    marginBottom: 20,
    flex: 1,
  },
  flashcardHint: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  flashcardHintText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
