import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Icon from './Icon';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface DueCardsNotificationProps {
  cardsDue: number;
  onPress: () => void;
  visible: boolean;
  onDismiss?: () => void;
}

export default function DueCardsNotification({ cardsDue, onPress, visible, onDismiss }: DueCardsNotificationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && cardsDue > 0) {
      // Fade in and scale animation
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, cardsDue]);

  if (!visible || cardsDue <= 0) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"  // Changed from "none" - native slide animation!
      onRequestClose={onDismiss}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onDismiss}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradient}
            >
              {onDismiss && (
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={onDismiss}
                >
                  <Icon name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground}>
                  <Icon name="layers" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cardsDue}</Text>
                </View>
              </View>
              
              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  {cardsDue} {cardsDue === 1 ? 'Card' : 'Cards'} Due for Review
                </Text>
                <Text style={styles.subtitle}>
                  Keep your streak going! Tap to start studying now.
                </Text>
              </View>
              
              <TouchableOpacity style={styles.button} onPress={onPress}>
                <Text style={styles.buttonText}>Start Studying</Text>
                <Icon name="arrow-forward" size={20} color="#6366F1" />
              </TouchableOpacity>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',  // Changed from 'center' - slide from bottom!
    alignItems: 'center',
    paddingBottom: 20,  // Space from bottom
  },
  container: {
    width: width * 0.85,
    maxWidth: 340,
  },
  gradient: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        borderWidth: 2,
        borderColor: 'rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      }
    }),
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,  // Changed from right: -4 - now on LEFT side!
    backgroundColor: '#FF3B30',
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
}); 