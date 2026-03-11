import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Platform, Easing } from 'react-native';
import Svg, {
  Circle,
  Rect,
  Path,
  Line,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// ============================================================================
// FL4SH LEVEL ICONS - React Native Compatible
// ============================================================================
// These icons avoid SVG filters (feGaussianBlur, feMerge) which don't work in RN
// Glow effects are achieved through:
// 1. Multiple layered shapes with decreasing opacity
// 2. Shadow props on container views
// 3. Animated opacity pulsing
// ============================================================================

const COLORS = {
  // Shift cyan toward electric blue to avoid green tint.
  cyan: '#00B8FF',
  cyanMuted: '#008AC8',
  cyanDark: '#0A5C9C',
  // Brighter neon pink for contrast.
  pink: '#FF2D9A',
  pinkMuted: '#FF5BC8',
  white: '#FFFFFF',
  gray: '#64748B',
  grayDark: '#374151',
  black: '#000000',
  background: '#0A0F1E',
};

interface LevelIconProps {
  size?: number;
  animated?: boolean;
}

// ============================================================================
// HELPER: Glow wrapper that works on both platforms
// ============================================================================

interface GlowWrapperProps {
  children: React.ReactNode;
  glowColor: string;
  intensity?: 'low' | 'medium' | 'high';
  size: number;
  animated?: boolean;
}

const GlowWrapper: React.FC<GlowWrapperProps> = ({ 
  children, 
  glowColor, 
  intensity = 'medium',
  size,
  animated = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animated]);

  const shadowRadius = intensity === 'high' ? 20 : intensity === 'medium' ? 12 : 6;
  const shadowOpacity = intensity === 'high' ? 0.8 : intensity === 'medium' ? 0.6 : 0.4;

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          // iOS shadow
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: shadowOpacity,
          shadowRadius: shadowRadius,
          // Android - we'll add a glow layer
        },
        animated && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Android glow simulation - colored background blur */}
      {Platform.OS === 'android' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: glowColor,
              opacity: shadowOpacity * 0.3,
              borderRadius: size / 2,
              transform: [{ scale: 1.3 }],
            },
          ]}
        />
      )}
      {children}
    </Animated.View>
  );
};

// ============================================================================
// LEVEL 1: STANDBY (0 XP)
// Zzz sleep mode - muted, low energy
// ============================================================================

export const StandbyIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!animated) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.8, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animated]);

  return (
    <GlowWrapper glowColor={COLORS.pink} intensity="low" size={size} animated={false}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Muted circle background */}
        <Circle cx="50" cy="50" r="40" fill="none" stroke={COLORS.pinkMuted} strokeWidth="2" opacity="0.3" />
        
        {/* Zzz text - stacked, neon pink */}
        <SvgText x="30" y="40" fill={COLORS.pink} fontSize="18" fontWeight="bold" opacity="0.5">Z</SvgText>
        <SvgText x="42" y="55" fill={COLORS.pink} fontSize="22" fontWeight="bold" opacity="0.7">Z</SvgText>
        <SvgText x="55" y="72" fill={COLORS.pink} fontSize="26" fontWeight="bold" opacity="0.9">Z</SvgText>
      </Svg>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 2: WAKING UP (250 XP)
// Blinking cursor - starting to come alive
// ============================================================================

export const WakingUpIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const blinkAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [animated]);

  const AnimatedRect = Animated.createAnimatedComponent(Rect);

  return (
    <GlowWrapper glowColor={COLORS.cyan} intensity="low" size={size} animated={false}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Terminal window outline */}
        <Rect x="15" y="20" width="70" height="60" rx="6" fill="none" stroke={COLORS.cyanDark} strokeWidth="2" />
        
        {/* Terminal header bar */}
        <Rect x="15" y="20" width="70" height="12" rx="6" fill={COLORS.cyanDark} opacity="0.3" />
        <Circle cx="25" cy="26" r="2" fill={COLORS.pink} opacity="0.7" />
        <Circle cx="33" cy="26" r="2" fill={COLORS.cyan} opacity="0.5" />
        
        {/* Command prompt */}
        <SvgText x="22" y="52" fill={COLORS.cyan} fontSize="12" fontFamily="monospace" opacity="0.7">&gt;_</SvgText>
        
        {/* Blinking cursor */}
        <AnimatedRect
          x="45"
          y="42"
          width="8"
          height="14"
          fill={COLORS.cyan}
          opacity={animated ? blinkAnim : 0.8}
        />
      </Svg>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 3: BOOTING (1,000 XP)
// Loading bar - progress happening
// ============================================================================

export const BootingIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const progressAnim = useRef(new Animated.Value(0.35)).current;
  const [progressWidth, setProgressWidth] = useState(35);

  useEffect(() => {
    if (!animated) return;
    
    const animateProgress = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, { 
            toValue: 0.9, 
            duration: 1800, 
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(progressAnim, { 
            toValue: 0.35, 
            duration: 1200, 
            useNativeDriver: false,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    };
    
    const listenerId = progressAnim.addListener(({ value }) => {
      setProgressWidth(value * 56); // 56 is max width (60 - 4 for padding)
    });
    
    animateProgress();
    
    return () => {
      progressAnim.removeListener(listenerId);
      progressAnim.stopAnimation();
    };
  }, [animated]);

  const displayPercent = Math.round((progressWidth / 56) * 100);

  return (
    <GlowWrapper glowColor={COLORS.cyan} intensity="medium" size={size} animated={false}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="loadingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={COLORS.cyan} />
            <Stop offset="100%" stopColor={COLORS.pink} />
          </LinearGradient>
        </Defs>
        
        {/* Outer ring */}
        <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.cyanDark} strokeWidth="2" opacity="0.4" />
        
        {/* Loading bar background */}
        <Rect x="20" y="42" width="60" height="16" rx="8" fill={COLORS.cyanDark} opacity="0.3" />
        
        {/* Loading bar fill - animated width */}
        <Rect x="22" y="44" width={progressWidth} height="12" rx="6" fill="url(#loadingGrad)" />
        
        {/* Loading bar shine */}
        <Rect x="22" y="44" width={progressWidth} height="4" rx="2" fill={COLORS.white} opacity="0.2" />
        
        {/* Percentage text */}
        <SvgText x="50" y="72" textAnchor="middle" fill={COLORS.cyan} fontSize="11" fontFamily="monospace">
          {displayPercent}%
        </SvgText>
      </Svg>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 4: ONLINE (5,000 XP)
// Power button - fully activated
// ============================================================================

export const OnlineIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  return (
    <GlowWrapper glowColor={COLORS.pink} intensity="high" size={size} animated={animated}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="powerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.pink} />
            <Stop offset="100%" stopColor={COLORS.cyan} />
          </LinearGradient>
        </Defs>
        
        {/* Outer glow ring (simulated with multiple circles) */}
        <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.2" />
        <Circle cx="50" cy="50" r="40" fill="none" stroke={COLORS.pink} strokeWidth="2" opacity="0.3" />
        
        {/* Main power ring */}
        <Circle cx="50" cy="50" r="35" fill="none" stroke="url(#powerRingGrad)" strokeWidth="4" />
        
        {/* Inner decorative ring */}
        <Circle cx="50" cy="50" r="28" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.5" />
        
        {/* Power line */}
        <Line x1="50" y1="22" x2="50" y2="45" stroke={COLORS.pink} strokeWidth="6" strokeLinecap="round" />
        
        {/* Power line glow layer */}
        <Line x1="50" y1="22" x2="50" y2="45" stroke={COLORS.white} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        
        {/* Center dot */}
        <Circle cx="50" cy="50" r="4" fill={COLORS.pink} />
        <Circle cx="50" cy="50" r="2" fill={COLORS.white} />
        
        {/* Energy radiating lines */}
        <Line x1="15" y1="50" x2="22" y2="50" stroke={COLORS.cyan} strokeWidth="2" opacity="0.6" />
        <Line x1="78" y1="50" x2="85" y2="50" stroke={COLORS.cyan} strokeWidth="2" opacity="0.6" />
      </Svg>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 5: OVERCLOCKED (20,000 XP)
// CPU with heat/flames - running hot
// ============================================================================

export const OverclockedIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const flameOpacity = useRef(new Animated.Value(1)).current;
  const flameScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    
    const flickerOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(flameOpacity, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        Animated.timing(flameOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flameOpacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
        Animated.timing(flameOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ])
    );
    
    const flickerScale = Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 1.05, duration: 250, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 0.97, duration: 150, useNativeDriver: true }),
        Animated.timing(flameScale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ])
    );
    
    flickerOpacity.start();
    flickerScale.start();
    
    return () => {
      flickerOpacity.stop();
      flickerScale.stop();
    };
  }, [animated]);

  return (
    <GlowWrapper glowColor={COLORS.pink} intensity="high" size={size} animated={false}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        {/* Base CPU - static */}
        <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.cyan} />
              <Stop offset="100%" stopColor={COLORS.cyanDark} />
            </LinearGradient>
          </Defs>
          
          {/* CPU body */}
          <Rect x="28" y="35" width="44" height="40" rx="4" fill="url(#cpuGrad)" />
          
          {/* CPU inner chip */}
          <Rect x="35" y="42" width="30" height="26" rx="2" fill={COLORS.cyanDark} />
          <Rect x="40" y="47" width="20" height="16" rx="1" fill={COLORS.cyan} opacity="0.3" />
          
          {/* CPU pins - top */}
          <Line x1="35" y1="35" x2="35" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="45" y1="35" x2="45" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="55" y1="35" x2="55" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="65" y1="35" x2="65" y2="28" stroke={COLORS.cyan} strokeWidth="2" />
          
          {/* CPU pins - sides */}
          <Line x1="28" y1="45" x2="21" y2="45" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="28" y1="55" x2="21" y2="55" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="28" y1="65" x2="21" y2="65" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="72" y1="45" x2="79" y2="45" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="72" y1="55" x2="79" y2="55" stroke={COLORS.cyan} strokeWidth="2" />
          <Line x1="72" y1="65" x2="79" y2="65" stroke={COLORS.cyan} strokeWidth="2" />
        </Svg>
        
        {/* Flames - animated overlay */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill,
            { 
              opacity: flameOpacity,
              transform: [{ scale: flameScale }],
            }
          ]}
        >
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
              <LinearGradient id="flameGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={COLORS.pink} />
                <Stop offset="50%" stopColor={COLORS.pinkMuted} />
                <Stop offset="100%" stopColor="#FFA500" />
              </LinearGradient>
            </Defs>
            
            {/* Flames */}
            <Path
              d="M38 35 Q40 20 45 28 Q43 15 50 22 Q52 10 55 22 Q60 15 57 28 Q62 20 62 35"
              fill="url(#flameGrad2)"
            />
            
            {/* Flame highlight */}
            <Path
              d="M45 32 Q48 22 50 28 Q52 22 55 32"
              fill={COLORS.white}
              opacity="0.4"
            />
          </Svg>
        </Animated.View>
      </View>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 6: NEURAL NET (75,000 XP)
// Circuit brain - thinking in algorithms
// ============================================================================

export const NeuralNetIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  return (
    <GlowWrapper glowColor={COLORS.cyan} intensity="high" size={size} animated={animated}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.cyan} />
            <Stop offset="100%" stopColor={COLORS.pink} />
          </LinearGradient>
        </Defs>
        
        {/* Brain outline */}
        <Path
          d="M50 15 
             Q70 15 78 30 
             Q85 45 80 60 
             Q75 75 60 82 
             Q50 88 40 82 
             Q25 75 20 60 
             Q15 45 22 30 
             Q30 15 50 15"
          fill="none"
          stroke="url(#brainGrad)"
          strokeWidth="3"
        />
        
        {/* Brain center divide */}
        <Path
          d="M50 20 Q48 50 50 80"
          fill="none"
          stroke={COLORS.cyanDark}
          strokeWidth="1"
          opacity="0.5"
        />
        
        {/* Left hemisphere - cyan circuits */}
        <Circle cx="32" cy="35" r="4" fill={COLORS.cyan} />
        <Circle cx="28" cy="55" r="3" fill={COLORS.cyan} />
        <Circle cx="35" cy="68" r="4" fill={COLORS.cyan} />
        <Circle cx="42" cy="45" r="3" fill={COLORS.cyan} />
        
        {/* Left circuit connections */}
        <Path d="M32 35 L42 45 L28 55 L35 68" fill="none" stroke={COLORS.cyan} strokeWidth="1.5" />
        <Path d="M32 35 L28 55" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.5" />
        
        {/* Right hemisphere - pink circuits */}
        <Circle cx="68" cy="35" r="4" fill={COLORS.pink} />
        <Circle cx="72" cy="55" r="3" fill={COLORS.pink} />
        <Circle cx="65" cy="68" r="4" fill={COLORS.pink} />
        <Circle cx="58" cy="45" r="3" fill={COLORS.pink} />
        
        {/* Right circuit connections */}
        <Path d="M68 35 L58 45 L72 55 L65 68" fill="none" stroke={COLORS.pink} strokeWidth="1.5" />
        <Path d="M68 35 L72 55" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.5" />
        
        {/* Cross connections */}
        <Path d="M42 45 L58 45" fill="none" stroke={COLORS.white} strokeWidth="1" opacity="0.6" />
        
        {/* Central processor node */}
        <Circle cx="50" cy="50" r="6" fill={COLORS.cyanDark} />
        <Circle cx="50" cy="50" r="4" fill={COLORS.cyan} />
        <Circle cx="50" cy="50" r="2" fill={COLORS.white} />
      </Svg>
    </GlowWrapper>
  );
};

// ============================================================================
// LEVEL 7: SINGULARITY (200,000 XP)
// Black hole / cosmic power - ultimate achievement
// ============================================================================

export const SingularityIcon: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );
    
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    
    rotate.start();
    pulse.start();
    
    return () => {
      rotate.stop();
      pulse.stop();
    };
  }, [animated]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer animated glow rings */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: spin }, { scale: pulseAnim }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Accretion disk rings */}
          <Circle cx="50" cy="50" r="45" fill="none" stroke={COLORS.pink} strokeWidth="1" opacity="0.3" />
          <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.cyan} strokeWidth="1" opacity="0.4" />
          <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.pink} strokeWidth="2" opacity="0.5" />
        </Svg>
      </Animated.View>
      
      {/* Main icon - static center */}
      <GlowWrapper glowColor="#FBBF24" intensity="high" size={size * 0.8}>
        <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="singularityGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.black} />
              <Stop offset="60%" stopColor={COLORS.black} />
              <Stop offset="80%" stopColor="#FBBF24" />
              <Stop offset="100%" stopColor={COLORS.pink} />
            </RadialGradient>
            <RadialGradient id="eventHorizonGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.white} />
              <Stop offset="40%" stopColor="#FBBF24" />
              <Stop offset="100%" stopColor={COLORS.pink} />
            </RadialGradient>
          </Defs>
          
          {/* Event horizon outer ring */}
          <Circle cx="50" cy="50" r="35" fill="none" stroke="#FBBF24" strokeWidth="3" />
          
          {/* Accretion glow */}
          <Circle cx="50" cy="50" r="30" fill="none" stroke={COLORS.pink} strokeWidth="6" opacity="0.4" />
          
          {/* Black hole center */}
          <Circle cx="50" cy="50" r="22" fill="url(#singularityGrad)" />
          
          {/* Hot inner ring */}
          <Circle cx="50" cy="50" r="18" fill="none" stroke="#FBBF24" strokeWidth="2" opacity="0.8" />
          
          {/* White hot core */}
          <Circle cx="50" cy="50" r="8" fill="url(#eventHorizonGrad)" />
          <Circle cx="50" cy="50" r="4" fill={COLORS.white} />
          
          {/* Energy jets */}
          <Path d="M50 5 L48 18 L50 15 L52 18 Z" fill="#FBBF24" />
          <Path d="M50 95 L52 82 L50 85 L48 82 Z" fill="#FBBF24" />
        </Svg>
      </GlowWrapper>
    </View>
  );
};

// ============================================================================
// ICON MAP EXPORT
// ============================================================================

export const LevelIcons = {
  standby: StandbyIcon,
  wakingUp: WakingUpIcon,
  booting: BootingIcon,
  online: OnlineIcon,
  overclocked: OverclockedIcon,
  neuralNet: NeuralNetIcon,
  singularity: SingularityIcon,
};

export const LEVEL_DATA = [
  { id: 'standby', name: 'Standby', points: 0, tagline: 'Currently in sleep mode.', Icon: StandbyIcon },
  { id: 'wakingUp', name: 'Waking Up', points: 250, tagline: 'Cursor blinking. Brain loading.', Icon: WakingUpIcon },
  { id: 'booting', name: 'Booting', points: 1000, tagline: 'Knowledge loading... please wait.', Icon: BootingIcon },
  { id: 'online', name: 'Online', points: 5000, tagline: 'Fully operational. Slightly dangerous.', Icon: OnlineIcon },
  { id: 'overclocked', name: 'Overclocked', points: 20000, tagline: "Running hot. Can't be stopped.", Icon: OverclockedIcon },
  { id: 'neuralNet', name: 'Neural Net', points: 75000, tagline: 'Thinking in algorithms now.', Icon: NeuralNetIcon },
  { id: 'singularity', name: 'Singularity', points: 200000, tagline: 'You ARE the revision.', Icon: SingularityIcon },
];

export default LevelIcons;
