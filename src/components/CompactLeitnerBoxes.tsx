import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

interface CompactLeitnerBoxesProps {
  boxes: {
    box1: number;
    box2: number;
    box3: number;
    box4: number;
    box5: number;
  };
  activeBox?: number;
}

const { width: screenWidth } = Dimensions.get('window');

export default function CompactLeitnerBoxes({ boxes, activeBox }: CompactLeitnerBoxesProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeBox) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activeBox]);

  const boxData = [
    { number: 1, count: boxes.box1, color: '#FF6B6B', label: 'Daily' },
    { number: 2, count: boxes.box2, color: '#4ECDC4', label: '2 days' },
    { number: 3, count: boxes.box3, color: '#45B7D1', label: '3 days' },
    { number: 4, count: boxes.box4, color: '#96CEB4', label: 'Weekly' },
    { number: 5, count: boxes.box5, color: '#DDA0DD', label: '3 weeks' },
  ];

  const renderBox = (box: typeof boxData[0], index: number) => {
    const isActive = activeBox === box.number;
    const boxWidth = (screenWidth - 48) / 5 - 6;

    return (
      <Animated.View
        key={box.number}
        style={[
          styles.box,
          {
            width: boxWidth,
            backgroundColor: box.color,
            transform: isActive ? [{ scale: pulseAnim }] : [],
          },
        ]}
      >
        <Text style={styles.boxNumber}>{box.number}</Text>
        <Text style={styles.boxCount}>{box.count}</Text>
        <View style={[styles.progressBar, { width: `${Math.min((box.count / 20) * 100, 100)}%` }]} />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LEITNER SYSTEM</Text>
        <View style={styles.legend}>
          {boxData.map((box, index) => (
            <View key={box.number} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: box.color }]} />
              <Text style={styles.legendText}>{box.label}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.boxesContainer}>
        {boxData.map((box, index) => renderBox(box, index))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a2e',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#AAA',
    fontFamily: 'monospace',
  },
  boxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  box: {
    height: 80,
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  boxNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  boxCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
}); 