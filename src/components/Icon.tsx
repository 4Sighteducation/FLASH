import React from 'react';
import { Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Emoji mapping for web platform
const emojiMap: Record<string, string> = {
  // Stats
  'albums': '📚',
  'albums-outline': '📚',
  'flame': '🔥',
  'star': '⭐',
  'star-outline': '⭐',
  'today': '📅',
  
  // Actions
  'add-circle': '➕',
  'add-circle-outline': '➕',
  'camera': '📷',
  'flag': '🚩',
  'school': '🎓',
  'school-outline': '🎓',
  
  // Navigation
  'chevron-forward': '›',
  'chevron-back': '‹',
  'arrow-back': '←',
  'close': '✕',
  
  // Profile
  'person': '👤',
  'color-palette-outline': '🎨',
  'notifications-outline': '🔔',
  'alert-circle-outline': '⚠️',
  'help-circle-outline': '❓',
  'key-outline': '🔑',
  'trash-outline': '🗑️',
  'log-out-outline': '🚪',
  'send': '📤',
};

interface IconProps {
  name: string;
  size: number;
  color: string;
  style?: any;
}

export default function Icon({ name, size, color, style }: IconProps) {
  if (Platform.OS === 'web') {
    const emoji = emojiMap[name] || '•';
    return (
      <Text style={[{ fontSize: size, lineHeight: size + 2 }, style]}>
        {emoji}
      </Text>
    );
  }
  
  return <Ionicons name={name as any} size={size} color={color} style={style} />;
}

