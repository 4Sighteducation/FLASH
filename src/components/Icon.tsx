import React from 'react';
import { Platform, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  'chevron-up': '▴',
  'arrow-back': '←',
  'arrow-forward': '→',
  'close': '✕',
  'close-circle': '⊗',
  'home': '🏠',
  'home-outline': '🏠',
  
  // Status
  'checkmark': '✓',
  'checkmark-circle': '✅',
  'alert-circle': '⚠️',
  'alert-circle-outline': '⚠️',
  'information-circle': 'ℹ️',
  'information-circle-outline': 'ℹ️',
  'time-outline': '⏱️',
  'time': '⏱️',
  'lock-closed': '🔒',
  'lock-closed-outline': '🔒',
  'eye-outline': '👁️',
  'eye': '👁️',
  
  // Profile & Settings
  'person': '👤',
  'person-outline': '👤',
  'mail-outline': '✉️',
  'calendar-outline': '📅',
  'color-palette-outline': '🎨',
  'notifications': '🔔',
  'notifications-outline': '🔔',
  'help-circle': '❓',
  'help-circle-outline': '❓',
  'key-outline': '🔑',
  'trash-outline': '🗑️',
  'trash': '🗑️',
  'log-out-outline': '🚪',
  'send': '📤',
  'settings-outline': '⚙️',
  'shield-checkmark': '🛡️',
  'card': '💳',
  'lock-closed-outline': '🔒',
  'document-outline': '📄',
  'open-outline': '🔗',
  
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
  'play': '▶️',
  'pause': '⏸️',
  'timer-outline': '⏱️',
  'arrow-up-circle': '⬆️',
  'arrow-down-circle': '⬇️',
  'refresh': '🔄',
  'mic': '🎤',
  'mic-outline': '🎤',
  'volume-high': '🔊',
  'refresh-outline': '🔄',
  'sync': '🔄',
  'print': '🖨️',
  'print-outline': '🖨️',
  
  // Organization  
  'list-outline': '📋',
  'list': '📋',
  'git-branch': '🌳',
  'layers-outline': '📑',
  'layers': '📑',
  'search': '🔍',
  'swap-horizontal': '🔄',
  'folder': '📁',
  'folder-open': '📂',
  'document-text': '📄',
  'document-text-outline': '📄',
  'git-network': '🌐',
  'telescope-outline': '🔭',
};

interface IconProps {
  name: string;
  size: number;
  color: string;
  style?: any;
}

export default function Icon({ name, size, color, style }: IconProps) {
  // Use emojis on ALL platforms for consistent look
  const emoji = emojiMap[name] || '•';
  return (
    <Text style={[{ fontSize: size, lineHeight: size + 2 }, style]}>
      {emoji}
    </Text>
  );
}

