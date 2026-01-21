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
// FL4SH LEVEL ICONS - LIGHT MODE VERSION
// ============================================================================
// Optimized for light backgrounds with:
// - Darker, more saturated colors
// - Drop shadows instead of glows
// - Strong outlines for definition
// - Better contrast ratios
// ============================================================================

const COLORS = {
  // Primary colors - darker/more saturated for light mode
  cyan: '#0891B2',        // Darker cyan
  cyanBright: '#06B6D4',  // Slightly brighter for accents
  cyanDark: '#0E7490',    // Even darker for depth
  
  pink: '#DB2777',        // Darker pink
  pinkBright: '#EC4899',  // Brighter for accents
  pinkDark: '#BE185D',    // Darker for depth
  
  // Accent colors
  orange: '#EA580C',
  gold: '#D97706',
  purple: '#7C3AED',
  
  // Neutrals
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
  black: '#000000',
  
  // Backgrounds for icon interiors
  surfaceLight: '#F8FAFC',
  surfaceMid: '#E2E8F0',
};

interface LevelIconProps {
  size?: number;
  animated?: boolean;
}

// ============================================================================
// HELPER: Shadow wrapper for light mode (drop shadow, not glow)
// ============================================================================

interface ShadowWrapperProps {
  children: React.ReactNode;
  shadowColor?: string;
  intensity?: 'low' | 'medium' | 'high';
  size: number;
  animated?: boolean;
}

const ShadowWrapper: React.FC<ShadowWrapperProps> = ({ 
  children, 
  shadowColor = COLORS.gray600,
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
          toValue: 1.08,
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

  const shadowRadius = intensity === 'high' ? 12 : intensity === 'medium' ? 8 : 4;
  const shadowOpacity = intensity === 'high' ? 0.25 : intensity === 'medium' ? 0.18 : 0.12;
  const elevation = intensity === 'high' ? 8 : intensity === 'medium' ? 5 : 3;

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          // iOS shadow - drop shadow style
          shadowColor: shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: shadowOpacity,
          shadowRadius: shadowRadius,
          // Android
          elevation: elevation,
        },
        animated && { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ============================================================================
// LEVEL 1: STANDBY (0 XP) - Light Mode
// ============================================================================

export const StandbyIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!animated) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [animated]);

  return (
    <ShadowWrapper shadowColor={COLORS.pink} intensity="low" size={size}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Background circle */}
        <Circle cx="50" cy="50" r="42" fill={COLORS.white} />
        <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.gray600} strokeWidth="2.5" />
        <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.pinkBright} strokeWidth="1.5" opacity="0.3" />
        
        {/* Zzz text - darker pink for contrast */}
        <SvgText x="28" y="40" fill={COLORS.pink} fontSize="18" fontWeight="bold" opacity="0.5">Z</SvgText>
        <SvgText x="40" y="55" fill={COLORS.pink} fontSize="22" fontWeight="bold" opacity="0.7">Z</SvgText>
        <SvgText x="53" y="72" fill={COLORS.pinkDark} fontSize="26" fontWeight="bold" opacity="0.9">Z</SvgText>
      </Svg>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 2: WAKING UP (250 XP) - Light Mode
// ============================================================================

export const WakingUpIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
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
    <ShadowWrapper shadowColor={COLORS.cyan} intensity="medium" size={size}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* Terminal window */}
        <Rect x="15" y="20" width="70" height="60" rx="8" fill={COLORS.white} />
        <Rect x="15" y="20" width="70" height="60" rx="8" fill="none" stroke={COLORS.gray600} strokeWidth="2.5" />
        
        {/* Terminal header bar */}
        <Rect x="15" y="20" width="70" height="14" rx="8" fill={COLORS.gray400} opacity="0.3" />
        <Circle cx="26" cy="27" r="3" fill={COLORS.pink} />
        <Circle cx="36" cy="27" r="3" fill={COLORS.gold} />
        <Circle cx="46" cy="27" r="3" fill={COLORS.cyan} />
        
        {/* Command prompt */}
        <SvgText x="22" y="54" fill={COLORS.cyan} fontSize="14" fontFamily="monospace" fontWeight="bold">&gt;_</SvgText>
        
        {/* Blinking cursor */}
        <AnimatedRect
          x="48"
          y="42"
          width="8"
          height="16"
          fill={COLORS.cyan}
          opacity={animated ? blinkAnim : 0.9}
        />
      </Svg>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 3: BOOTING (1,000 XP) - Light Mode
// ============================================================================

export const BootingIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
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
      setProgressWidth(value * 56);
    });
    
    animateProgress();
    
    return () => {
      progressAnim.removeListener(listenerId);
      progressAnim.stopAnimation();
    };
  }, [animated]);

  const displayPercent = Math.round((progressWidth / 56) * 100);

  return (
    <ShadowWrapper shadowColor={COLORS.cyan} intensity="medium" size={size}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="loadingGradLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={COLORS.cyan} />
            <Stop offset="100%" stopColor={COLORS.pink} />
          </LinearGradient>
        </Defs>
        
        {/* Background circle */}
        <Circle cx="50" cy="50" r="42" fill={COLORS.white} />
        <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.gray600} strokeWidth="2.5" />
        <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.cyan} strokeWidth="1.5" opacity="0.3" />
        
        {/* Loading bar background */}
        <Rect x="20" y="42" width="60" height="16" rx="8" fill={COLORS.surfaceMid} />
        <Rect x="20" y="42" width="60" height="16" rx="8" fill="none" stroke={COLORS.gray400} strokeWidth="1.5" />
        
        {/* Loading bar fill */}
        <Rect x="22" y="44" width={progressWidth} height="12" rx="6" fill="url(#loadingGradLight)" />
        
        {/* Percentage text */}
        <SvgText x="50" y="72" textAnchor="middle" fill={COLORS.cyanDark} fontSize="12" fontFamily="monospace" fontWeight="bold">
          {displayPercent}%
        </SvgText>
      </Svg>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 4: ONLINE (5,000 XP) - Light Mode
// ============================================================================

export const OnlineIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  return (
    <ShadowWrapper shadowColor={COLORS.pink} intensity="high" size={size} animated={animated}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="powerRingGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.pink} />
            <Stop offset="100%" stopColor={COLORS.cyan} />
          </LinearGradient>
        </Defs>
        
        {/* Background */}
        <Circle cx="50" cy="50" r="42" fill={COLORS.white} />
        
        {/* Outer rings */}
        <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.pinkBright} strokeWidth="2" opacity="0.2" />
        <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.pinkBright} strokeWidth="3" opacity="0.3" />
        
        {/* Main power ring */}
        <Circle cx="50" cy="50" r="32" fill="none" stroke="url(#powerRingGradLight)" strokeWidth="5" />
        
        {/* Inner ring */}
        <Circle cx="50" cy="50" r="26" fill="none" stroke={COLORS.cyan} strokeWidth="1.5" opacity="0.4" />
        
        {/* Power line */}
        <Line x1="50" y1="22" x2="50" y2="44" stroke={COLORS.pinkDark} strokeWidth="7" strokeLinecap="round" />
        <Line x1="50" y1="22" x2="50" y2="44" stroke={COLORS.pink} strokeWidth="4" strokeLinecap="round" />
        
        {/* Center dot */}
        <Circle cx="50" cy="50" r="5" fill={COLORS.pinkDark} />
        <Circle cx="50" cy="50" r="3" fill={COLORS.pink} />
        
        {/* Energy lines */}
        <Line x1="12" y1="50" x2="20" y2="50" stroke={COLORS.cyan} strokeWidth="3" strokeLinecap="round" />
        <Line x1="80" y1="50" x2="88" y2="50" stroke={COLORS.cyan} strokeWidth="3" strokeLinecap="round" />
      </Svg>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 5: OVERCLOCKED (20,000 XP) - Light Mode
// ============================================================================

export const OverclockedIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
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
    <ShadowWrapper shadowColor={COLORS.orange} intensity="high" size={size}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        {/* Base CPU */}
        <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="cpuGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={COLORS.cyanBright} />
              <Stop offset="100%" stopColor={COLORS.cyan} />
            </LinearGradient>
          </Defs>
          
          {/* CPU body */}
          <Rect x="28" y="35" width="44" height="40" rx="4" fill="url(#cpuGradLight)" />
          <Rect x="28" y="35" width="44" height="40" rx="4" fill="none" stroke={COLORS.cyanDark} strokeWidth="1" />
          
          {/* CPU inner chip */}
          <Rect x="35" y="42" width="30" height="26" rx="3" fill={COLORS.white} />
          <Rect x="35" y="42" width="30" height="26" rx="3" fill="none" stroke={COLORS.cyanDark} strokeWidth="1" opacity="0.5" />
          <Rect x="40" y="47" width="20" height="16" rx="2" fill={COLORS.surfaceMid} />
          
          {/* CPU pins - top */}
          <Line x1="35" y1="35" x2="35" y2="26" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="45" y1="35" x2="45" y2="26" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="55" y1="35" x2="55" y2="26" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="65" y1="35" x2="65" y2="26" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          
          {/* CPU pins - sides */}
          <Line x1="28" y1="45" x2="19" y2="45" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="28" y1="55" x2="19" y2="55" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="28" y1="65" x2="19" y2="65" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="72" y1="45" x2="81" y2="45" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="72" y1="55" x2="81" y2="55" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
          <Line x1="72" y1="65" x2="81" y2="65" stroke={COLORS.cyanDark} strokeWidth="3" strokeLinecap="round" />
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
              <LinearGradient id="flameGradLight" x1="0%" y1="100%" x2="0%" y2="0%">
                <Stop offset="0%" stopColor={COLORS.pinkDark} />
                <Stop offset="40%" stopColor={COLORS.pink} />
                <Stop offset="70%" stopColor={COLORS.orange} />
                <Stop offset="100%" stopColor="#FBBF24" />
              </LinearGradient>
            </Defs>
            
            {/* Flames with dark outline for visibility */}
            <Path
              d="M38 35 Q40 20 45 28 Q43 13 50 20 Q52 8 55 20 Q60 13 57 28 Q62 20 62 35"
              fill="url(#flameGradLight)"
            />
            <Path
              d="M38 35 Q40 20 45 28 Q43 13 50 20 Q52 8 55 20 Q60 13 57 28 Q62 20 62 35"
              fill="none"
              stroke={COLORS.orange}
              strokeWidth="1"
              opacity="0.5"
            />
            
            {/* Flame highlight */}
            <Path
              d="M45 30 Q48 20 50 26 Q52 20 55 30"
              fill="#FEF3C7"
              opacity="0.8"
            />
          </Svg>
        </Animated.View>
      </View>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 6: NEURAL NET (75,000 XP) - Light Mode
// ============================================================================

export const NeuralNetIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
  return (
    <ShadowWrapper shadowColor={COLORS.purple} intensity="high" size={size} animated={animated}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="brainGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.cyan} />
            <Stop offset="100%" stopColor={COLORS.pink} />
          </LinearGradient>
        </Defs>
        
        {/* Background */}
        <Circle cx="50" cy="50" r="42" fill={COLORS.white} />
        <Circle cx="50" cy="50" r="42" fill="none" stroke={COLORS.gray200} strokeWidth="2" />
        
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
          fill={COLORS.surfaceLight}
          stroke="url(#brainGradLight)"
          strokeWidth="3"
        />
        
        {/* Brain center divide */}
        <Path
          d="M50 20 Q48 50 50 80"
          fill="none"
          stroke={COLORS.gray200}
          strokeWidth="2"
        />
        
        {/* Left hemisphere - cyan circuits */}
        <Circle cx="32" cy="35" r="5" fill={COLORS.cyan} stroke={COLORS.cyanDark} strokeWidth="1" />
        <Circle cx="28" cy="55" r="4" fill={COLORS.cyan} stroke={COLORS.cyanDark} strokeWidth="1" />
        <Circle cx="35" cy="68" r="5" fill={COLORS.cyan} stroke={COLORS.cyanDark} strokeWidth="1" />
        <Circle cx="42" cy="45" r="4" fill={COLORS.cyanBright} stroke={COLORS.cyan} strokeWidth="1" />
        
        {/* Left circuit connections */}
        <Path d="M32 35 L42 45 L28 55 L35 68" fill="none" stroke={COLORS.cyan} strokeWidth="2" />
        <Path d="M32 35 L28 55" fill="none" stroke={COLORS.cyanBright} strokeWidth="1.5" opacity="0.6" />
        
        {/* Right hemisphere - pink circuits */}
        <Circle cx="68" cy="35" r="5" fill={COLORS.pink} stroke={COLORS.pinkDark} strokeWidth="1" />
        <Circle cx="72" cy="55" r="4" fill={COLORS.pink} stroke={COLORS.pinkDark} strokeWidth="1" />
        <Circle cx="65" cy="68" r="5" fill={COLORS.pink} stroke={COLORS.pinkDark} strokeWidth="1" />
        <Circle cx="58" cy="45" r="4" fill={COLORS.pinkBright} stroke={COLORS.pink} strokeWidth="1" />
        
        {/* Right circuit connections */}
        <Path d="M68 35 L58 45 L72 55 L65 68" fill="none" stroke={COLORS.pink} strokeWidth="2" />
        <Path d="M68 35 L72 55" fill="none" stroke={COLORS.pinkBright} strokeWidth="1.5" opacity="0.6" />
        
        {/* Cross connections */}
        <Path d="M42 45 L58 45" fill="none" stroke={COLORS.gray400} strokeWidth="2" />
        
        {/* Central processor node */}
        <Circle cx="50" cy="50" r="8" fill={COLORS.white} stroke={COLORS.purple} strokeWidth="2" />
        <Circle cx="50" cy="50" r="5" fill={COLORS.purple} />
        <Circle cx="50" cy="50" r="2" fill={COLORS.white} />
      </Svg>
    </ShadowWrapper>
  );
};

// ============================================================================
// LEVEL 7: SINGULARITY (200,000 XP) - Light Mode
// ============================================================================

export const SingularityIconLight: React.FC<LevelIconProps> = ({ size = 80, animated = false }) => {
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
      {/* Outer animated rings */}
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
          <Circle cx="50" cy="50" r="46" fill="none" stroke={COLORS.gold} strokeWidth="1" opacity="0.3" />
          <Circle cx="50" cy="50" r="43" fill="none" stroke={COLORS.pink} strokeWidth="1.5" opacity="0.4" />
          <Circle cx="50" cy="50" r="40" fill="none" stroke={COLORS.gold} strokeWidth="2" opacity="0.5" />
        </Svg>
      </Animated.View>
      
      {/* Main singularity */}
      <ShadowWrapper shadowColor={COLORS.gold} intensity="high" size={size * 0.8}>
        <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="singularityGradLight" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.gray800} />
              <Stop offset="50%" stopColor={COLORS.gray800} />
              <Stop offset="75%" stopColor={COLORS.gold} />
              <Stop offset="100%" stopColor={COLORS.pink} />
            </RadialGradient>
            <RadialGradient id="coreGradLight" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={COLORS.white} />
              <Stop offset="50%" stopColor="#FEF3C7" />
              <Stop offset="100%" stopColor={COLORS.gold} />
            </RadialGradient>
          </Defs>
          
          {/* Background */}
          <Circle cx="50" cy="50" r="40" fill={COLORS.white} />
          
          {/* Event horizon outer ring */}
          <Circle cx="50" cy="50" r="38" fill="none" stroke={COLORS.gold} strokeWidth="4" />
          
          {/* Accretion disk */}
          <Circle cx="50" cy="50" r="32" fill="none" stroke={COLORS.pink} strokeWidth="6" opacity="0.4" />
          
          {/* Black hole center */}
          <Circle cx="50" cy="50" r="24" fill="url(#singularityGradLight)" />
          
          {/* Inner gold ring */}
          <Circle cx="50" cy="50" r="20" fill="none" stroke={COLORS.gold} strokeWidth="2" />
          
          {/* Hot core */}
          <Circle cx="50" cy="50" r="10" fill="url(#coreGradLight)" />
          <Circle cx="50" cy="50" r="5" fill={COLORS.white} />
          
          {/* Energy jets */}
          <Path d="M50 5 L47 20 L50 16 L53 20 Z" fill={COLORS.gold} />
          <Path d="M50 95 L53 80 L50 84 L47 80 Z" fill={COLORS.gold} />
        </Svg>
      </ShadowWrapper>
    </View>
  );
};

// ============================================================================
// ICON MAP EXPORT - Light Mode
// ============================================================================

export const LevelIconsLight = {
  standby: StandbyIconLight,
  wakingUp: WakingUpIconLight,
  booting: BootingIconLight,
  online: OnlineIconLight,
  overclocked: OverclockedIconLight,
  neuralNet: NeuralNetIconLight,
  singularity: SingularityIconLight,
};

export const LEVEL_DATA_LIGHT = [
  { id: 'standby', name: 'Standby', points: 0, tagline: 'Currently in sleep mode.', Icon: StandbyIconLight },
  { id: 'wakingUp', name: 'Waking Up', points: 250, tagline: 'Cursor blinking. Brain loading.', Icon: WakingUpIconLight },
  { id: 'booting', name: 'Booting', points: 1000, tagline: 'Knowledge loading... please wait.', Icon: BootingIconLight },
  { id: 'online', name: 'Online', points: 5000, tagline: 'Fully operational. Slightly dangerous.', Icon: OnlineIconLight },
  { id: 'overclocked', name: 'Overclocked', points: 20000, tagline: "Running hot. Can't be stopped.", Icon: OverclockedIconLight },
  { id: 'neuralNet', name: 'Neural Net', points: 75000, tagline: 'Thinking in algorithms now.', Icon: NeuralNetIconLight },
  { id: 'singularity', name: 'Singularity', points: 200000, tagline: 'You ARE the revision.', Icon: SingularityIconLight },
];

export default LevelIconsLight;
