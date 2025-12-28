import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface CardSwooshAnimationProps {
  visible: boolean;
  fromPosition: { x: number; y: number };
  toBox: number;
  color: string;
  onComplete: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CardSwooshAnimation({
  visible,
  fromPosition,
  toBox,
  color,
  onComplete,
}: CardSwooshAnimationProps) {
  const translateX = useRef(new Animated.Value(fromPosition.x)).current;
  const translateY = useRef(new Animated.Value(fromPosition.y)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Calculate target position based on box number
      // The boxes are in the CompactLeitnerBoxes component at the top
      const boxWidth = (screenWidth - 48) / 5 - 6;
      const boxGap = 6;
      const startX = 24; // padding
      const targetX = startX + (toBox - 1) * (boxWidth + boxGap) + boxWidth / 2;
      const targetY = 140; // Approximate Y position of the Leitner boxes

      // Reset animation values
      translateX.setValue(fromPosition.x);
      translateY.setValue(fromPosition.y);
      scale.setValue(1);
      opacity.setValue(1);
      rotation.setValue(0);

      // Create swoosh animation with a curved path
      const midX = (fromPosition.x + targetX) / 2;
      const midY = Math.min(fromPosition.y, targetY) - 100; // Arc upward

      Animated.sequence([
        // First half: move up and to the middle with slight rotation
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: midX,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: midY,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 180,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
        // Second half: move down to target with continued rotation
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: targetY,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.2,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 360,
            duration: 520,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.8,
              duration: 380,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 140,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        onComplete();
      });
    }
  }, [visible, fromPosition, toBox]);

  if (!visible) return null;

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: color,
          transform: [
            { translateX },
            { translateY },
            { scale },
            { rotate: rotateInterpolate },
          ],
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 60,
    height: 80,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
}); 