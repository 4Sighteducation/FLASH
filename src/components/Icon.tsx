import React from 'react';
import { Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';

// Emoji mapping for web platform
const emojiMap: Record<string, string> = {
  // Stats & Cards
  'albums': '📚',
  'albums-outline': '📚',
  'flame': '🔥',
  'star': '⭐',
  'star-outline': '⭐',
  'today': '📅',
  'flash': '⚡',
  'flash-outline': '⚡',
  
  // Actions
  'add-circle': '➕',
  'add-circle-outline': '➕',
  'camera': '📷',
  'flag': '🚩',
  'flag-outline': '🚩',
  'school': '🎓',
  'school-outline': '🎓',
  'create-outline': '✏️',
  'pencil': '✏️',
  'images': '🖼️',
  
  // Navigation
  'chevron-forward': '›',
  'chevron-back': '‹',
  'chevron-down': '▾',
  'arrow-back': '←',
  'arrow-forward': '→',
  'close': '✕',
  'close-circle': '⊗',
  
  // Status
  'checkmark': '✓',
  'checkmark-circle': '✅',
  'alert-circle': '⚠️',
  'alert-circle-outline': '⚠️',
  'information-circle': 'ℹ️',
  
  // Profile & Settings
  'person': '👤',
  'color-palette-outline': '🎨',
  'notifications-outline': '🔔',
  'help-circle-outline': '❓',
  'key-outline': '🔑',
  'trash-outline': '🗑️',
  'trash': '🗑️',
  'log-out-outline': '🚪',
  'send': '📤',
  'settings-outline': '⚙️',
  'shield-checkmark': '🛡️',
  'card': '💳',
  
  // Social
  'logo-google': 'G',
  'logo-microsoft': 'M',
  'logo-apple': '',
  'call': '📞',
  
  // Learning
  'book': '📖',
  'bulb-outline': '💡',
  'trophy': '🏆',
  'trending-up': '📈',
  'rocket-outline': '🚀',
  'play-circle': '▶️',
  
  // Organization  
  'list-outline': '📋',
  'git-branch': '🌳',
  'layers-outline': '📑',
  'search': '🔍',
  'swap-horizontal': '🔄',
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

