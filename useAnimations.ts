import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from './ThemeContext';

// ============================================================================
// FL4SH ANIMATION HOOKS - React Native Compatible
// ============================================================================
// Uses React Native's Animated API - works on iOS, Android, and Web
// No CSS keyframes required
// ============================================================================

/**
 * Pulse animation - gentle scale breathing effect
 * Used for: Cards, buttons, active elements
 */
export const usePulseAnimation = (enabled: boolean = true) => {
  const { effects } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!enabled || !effects.animations.pulseEnabled) {
      scaleAnim.setValue(1);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: effects.animations.pulseScale,
          duration: effects.animations.pulseDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: effects.animations.pulseDuration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => pulse.stop();
  }, [enabled, effects.animations.pulseEnabled, effects.animations.pulseScale, effects.animations.pulseDuration]);

  return {
    transform: [{ scale: scaleAnim }],
  };
};

/**
 * Float animation - gentle vertical movement
 * Used for: Cards, badges, decorative elements
 */
export const useFloatAnimation = (enabled: boolean = true) => {
  const { effects } = useTheme();
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!enabled || !effects.animations.floatEnabled) {
      translateY.setValue(0);
      return;
    }

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -effects.animations.floatDistance,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    float.start();

    return () => float.stop();
  }, [enabled, effects.animations.floatEnabled, effects.animations.floatDistance]);

  return {
    transform: [{ translateY }],
  };
};

/**
 * Glow animation - opacity pulsing for glow effect
 * Used for: Borders, shadows, accent elements
 * Note: Apply this to an overlay/border view, not the main content
 */
export const useGlowAnimation = (enabled: boolean = true) => {
  const { effects } = useTheme();
  const opacity = useRef(new Animated.Value(effects.animations.glowIntensity * 0.6)).current;

  useEffect(() => {
    if (!enabled || !effects.animations.glowEnabled) {
      opacity.setValue(effects.animations.glowIntensity * 0.6);
      return;
    }

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: effects.animations.glowIntensity,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: effects.animations.glowIntensity * 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    glow.start();

    return () => glow.stop();
  }, [enabled, effects.animations.glowEnabled, effects.animations.glowIntensity]);

  return { opacity };
};

/**
 * Press animation - scale down on press
 * Used for: Buttons, cards, interactive elements
 */
export const usePressAnimation = () => {
  const { effects } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: effects.timing.fast,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: effects.timing.fast,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  return {
    animatedStyle: { transform: [{ scale }] },
    onPressIn,
    onPressOut,
  };
};

/**
 * Fade in animation - for mounting elements
 * Used for: Cards appearing, modals, transitions
 */
export const useFadeIn = (delay: number = 0) => {
  const { effects } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: effects.timing.medium,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: effects.timing.medium,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, effects.timing.medium]);

  return {
    opacity,
    transform: [{ translateY }],
  };
};

/**
 * Heartbeat animation - for Pulse theme specifically
 * Double-beat like a real heart
 */
export const useHeartbeatAnimation = (enabled: boolean = true) => {
  const { themeMode, effects } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Only enable for Pulse theme
    if (!enabled || themeMode !== 'pulse') {
      scale.setValue(1);
      return;
    }

    const heartbeat = Animated.loop(
      Animated.sequence([
        // First beat
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        // Short pause
        Animated.delay(80),
        // Second beat (slightly smaller)
        Animated.timing(scale, {
          toValue: 1.025,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        // Long pause before next heartbeat
        Animated.delay(1200),
      ])
    );

    heartbeat.start();

    return () => heartbeat.stop();
  }, [enabled, themeMode]);

  return {
    transform: [{ scale }],
  };
};

/**
 * Shimmer animation - for loading states and Singularity text
 * Note: This returns a translateX value to animate a gradient overlay
 */
export const useShimmerAnimation = (width: number = 200) => {
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    shimmer.start();

    return () => shimmer.stop();
  }, [width]);

  return {
    transform: [{ translateX }],
  };
};

/**
 * Stagger animation helper - for lists of items
 * Returns an array of animated values with staggered delays
 */
export const useStaggerAnimation = (itemCount: number, staggerDelay: number = 50) => {
  const { effects } = useTheme();
  const animations = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  useEffect(() => {
    const staggeredAnimations = animations.map((anim, index) =>
      Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: effects.timing.medium,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: 0,
          duration: effects.timing.medium,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(staggeredAnimations).start();
  }, [itemCount, staggerDelay, effects.timing.medium]);

  return animations.map((anim) => ({
    opacity: anim.opacity,
    transform: [{ translateY: anim.translateY }],
  }));
};

// ============================================================================
// COMBINED ANIMATION HOOKS
// ============================================================================

/**
 * Card animation - combines pulse + float based on theme
 */
export const useCardAnimation = (enabled: boolean = true) => {
  const { themeMode } = useTheme();
  const pulse = usePulseAnimation(enabled);
  const float = useFloatAnimation(enabled && (themeMode === 'aurora' || themeMode === 'singularity'));

  return {
    transform: [
      ...(pulse.transform || []),
      ...(float.transform || []),
    ],
  };
};

/**
 * Button animation - press + optional pulse
 */
export const useButtonAnimation = (enablePulse: boolean = false) => {
  const press = usePressAnimation();
  const pulse = usePulseAnimation(enablePulse);

  return {
    animatedStyle: {
      transform: [
        ...press.animatedStyle.transform,
        ...(enablePulse ? pulse.transform : []),
      ],
    },
    onPressIn: press.onPressIn,
    onPressOut: press.onPressOut,
  };
};
