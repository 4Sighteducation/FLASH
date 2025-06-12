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
      const boxWidth = (screenWidth - 48) / 5 - 8;
      const targetX = 32 + (toBox - 1) * (boxWidth + 8) + boxWidth / 2;
      const targetY = screenHeight * 0.3; // Position of the boxes

      // Reset animation values
      translateX.setValue(fromPosition.x);
      translateY.setValue(fromPosition.y);
      scale.setValue(1);
      opacity.setValue(1);
      rotation.setValue(0);

      // Create swoosh animation
      Animated.parallel([
        // Movement animation with curve
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: targetX,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateY, {
          toValue: targetY,
          duration: 800,
          useNativeDriver: true,
        }),
        // Scale down as it moves
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        // Fade out at the end
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Rotation for swoosh effect
        Animated.timing(rotation, {
          toValue: 360,
          duration: 800,
          useNativeDriver: true,
        }),
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
    width: 80,
    height: 100,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
}); 