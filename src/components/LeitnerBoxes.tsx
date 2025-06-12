import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

interface LeitnerBoxesProps {
  boxes: {
    box1: number;
    box2: number;
    box3: number;
    box4: number;
    box5: number;
  };
  activeBox?: number;
  onCardMove?: (fromBox: number, toBox: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function LeitnerBoxes({ boxes, activeBox }: LeitnerBoxesProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for active box
    if (activeBox) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activeBox]);

  const boxData = [
    { number: 1, label: 'DAILY', count: boxes.box1, color: '#FF6B6B', schedule: 'Every day' },
    { number: 2, label: 'ALTERNATE', count: boxes.box2, color: '#4ECDC4', schedule: 'Every 2 days' },
    { number: 3, label: 'TRIDAY', count: boxes.box3, color: '#45B7D1', schedule: 'Every 3 days' },
    { number: 4, label: 'WEEKLY', count: boxes.box4, color: '#96CEB4', schedule: 'Once a week' },
    { number: 5, label: 'RETIRED', count: boxes.box5, color: '#DDA0DD', schedule: 'Mastered' },
  ];

  const renderBox = (box: typeof boxData[0], index: number) => {
    const isActive = activeBox === box.number;
    const boxWidth = (screenWidth - 48) / 5 - 8;

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
        <View style={styles.boxInner}>
          {/* Pixelated top section */}
          <View style={styles.pixelatedTop}>
            <Text style={styles.boxNumber}>{box.number}</Text>
          </View>
          
          {/* Main content area */}
          <View style={styles.boxContent}>
            <Text style={styles.boxLabel}>{box.label}</Text>
            <View style={styles.countContainer}>
              <Text style={styles.boxCount}>{box.count}</Text>
            </View>
          </View>

          {/* Bottom indicator */}
          <View style={styles.boxBottom}>
            <View style={[styles.progressBar, { width: `${Math.min((box.count / 20) * 100, 100)}%` }]} />
          </View>
        </View>

        {isActive && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim,
              },
            ]}
          />
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LEITNER SYSTEM</Text>
        <Text style={styles.subtitle}>Spaced Repetition Progress</Text>
      </View>
      
      <View style={styles.boxesContainer}>
        {boxData.map((box, index) => renderBox(box, index))}
      </View>

      <View style={styles.legend}>
        {boxData.map((box) => (
          <View key={box.number} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: box.color }]} />
            <Text style={styles.legendText}>Box {box.number}: {box.schedule}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    margin: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  boxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  box: {
    height: 120,
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  boxInner: {
    flex: 1,
    position: 'relative',
  },
  pixelatedTop: {
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.3)',
  },
  boxNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  boxContent: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  countContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  boxCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  boxBottom: {
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  legend: {
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#AAA',
    fontFamily: 'monospace',
  },
}); 