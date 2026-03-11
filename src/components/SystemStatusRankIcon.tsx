import React, { memo } from 'react';
import { Platform, View } from 'react-native';
import { LevelIcons } from '../../LevelIcons';
import { LevelIconsLight } from '../../LevelIconsLight';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  rankKey: string;
  size?: number;
  // If true, adds subtle native shadow around the icon container (helps "glow" on mobile).
  withContainerGlow?: boolean;
  // If true, enables icon animations (pulse/rotate/blink).
  animated?: boolean;
  // Force light/dark icon variants (defaults to current theme).
  variant?: 'light' | 'dark';
};

function iconKeyForRank(rankKey: string) {
  switch (rankKey) {
    case 'rookie':
      return 'standby';
    case 'learner':
      return 'wakingUp';
    case 'scholar':
      return 'booting';
    case 'contender':
      return 'online';
    case 'ace':
      return 'overclocked';
    case 'elite':
      return 'neuralNet';
    case 'legend':
    case 'singularity':
      return 'singularity';
    default:
      return 'standby';
  }
}

function SystemStatusRankIconInner({
  rankKey,
  size = 44,
  withContainerGlow = true,
  animated = true,
  variant,
}: Props) {
  const { colorScheme } = useTheme();
  const iconKey = iconKeyForRank(rankKey);
  const iconSet = variant === 'light' || (!variant && colorScheme === 'light') ? LevelIconsLight : LevelIcons;
  const IconCmp = (iconSet as any)[iconKey] || iconSet.standby;
  const wrapSize = size;
  const iconSize = Math.max(12, size - 4);

  const baseContainerStyle = {
    width: wrapSize,
    height: wrapSize,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: wrapSize / 2,
  };

  return (
    <View
      style={
        withContainerGlow
          ? [
              {
                ...baseContainerStyle,
                backgroundColor: 'rgba(0,0,0,0.08)',
                overflow: 'hidden',
              },
              Platform.select({
                ios: {
                  shadowColor: '#FFFFFF',
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                },
                android: {
                  elevation: 4,
                },
                default: {},
              }),
            ]
          : [
              {
                ...baseContainerStyle,
                overflow: 'hidden',
              },
            ]
      }
    >
      <IconCmp size={iconSize} animated={animated} />
    </View>
  );
}

export default memo(SystemStatusRankIconInner);
