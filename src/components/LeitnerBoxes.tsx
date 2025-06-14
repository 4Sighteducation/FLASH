import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  const scaleAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    // Animate active box
    if (activeBox && activeBox >= 1 && activeBox <= 5) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnims[activeBox - 1], {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnims[activeBox - 1], {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [activeBox]);

  const boxData = [
    { 
      number: 1, 
      label: 'New', 
      count: boxes.box1, 
      colors: ['#FF6B6B', '#FF8E53'],
      icon: 'flash',
      schedule: 'Daily review',
      emoji: '🔥'
    },
    { 
      number: 2, 
      label: 'Learning', 
      count: boxes.box2, 
      colors: ['#4ECDC4', '#44A08D'],
      icon: 'trending-up',
      schedule: 'Every 2 days',
      emoji: '📈'
    },
    { 
      number: 3, 
      label: 'Growing', 
      count: boxes.box3, 
      colors: ['#45B7D1', '#2196F3'],
      icon: 'rocket',
      schedule: 'Every 3 days',
      emoji: '🚀'
    },
    { 
      number: 4, 
      label: 'Strong', 
      count: boxes.box4, 
      colors: ['#96CEB4', '#4CAF50'],
      icon: 'shield-checkmark',
      schedule: 'Weekly',
      emoji: '💪'
    },
    { 
      number: 5, 
      label: 'Mastered', 
      count: boxes.box5, 
      colors: ['#DDA0DD', '#9C27B0'],
      icon: 'trophy',
      schedule: 'Complete!',
      emoji: '🏆'
    },
  ];

  const totalCards = Object.values(boxes).reduce((sum, count) => sum + count, 0);

  const renderBox = (box: typeof boxData[0], index: number) => {
    const isActive = activeBox === box.number;
    const percentage = totalCards > 0 ? Math.round((box.count / totalCards) * 100) : 0;

    return (
      <Animated.View
        key={box.number}
        style={[
          styles.boxWrapper,
          {
            transform: [{ scale: scaleAnims[index] }],
            zIndex: isActive ? 10 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={box.colors as any}
          style={[
            styles.box,
            isActive && styles.activeBox,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.boxHeader}>
            <Text style={styles.boxEmoji}>{box.emoji}</Text>
            <View style={styles.boxBadge}>
              <Text style={styles.boxNumber}>{box.number}</Text>
            </View>
          </View>
          
          <View style={styles.boxContent}>
            <Text style={styles.boxLabel}>{box.label}</Text>
            <View style={styles.countContainer}>
              <Text style={styles.boxCount}>{box.count}</Text>
              <Text style={styles.boxCountLabel}>cards</Text>
            </View>
            
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.percentageText}>{percentage}%</Text>
            </View>
          </View>

          <View style={styles.boxFooter}>
            <Ionicons name={box.icon as any} size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.scheduleText}>{box.schedule}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Study Progress</Text>
        <Text style={styles.subtitle}>Cards distributed across learning stages</Text>
      </View>
      
      <View style={styles.boxesContainer}>
        {boxData.map((box, index) => renderBox(box, index))}
      </View>

      {/* Summary stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalCards}</Text>
          <Text style={styles.summaryLabel}>Total Cards</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{boxes.box1}</Text>
          <Text style={styles.summaryLabel}>Due Today</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{boxes.box5}</Text>
          <Text style={styles.summaryLabel}>Mastered</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  boxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  boxWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  box: {
    height: 140,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  activeBox: {
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  boxEmoji: {
    fontSize: 20,
  },
  boxBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  boxContent: {
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  countContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  boxCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  boxCountLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 2,
  },
  percentageText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  boxFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
}); 