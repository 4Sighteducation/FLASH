import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface NeonSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: ViewStyle;
  showSuggestions?: boolean;
  suggestions?: string[];
  isLoading?: boolean;
}

export default function NeonSearchBar({
  value,
  onChangeText,
  placeholder = "Search topics...",
  onFocus,
  onBlur,
  style,
  showSuggestions = false,
  suggestions = [],
  isLoading = false,
}: NeonSearchBarProps) {
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  // Neon border animation
  useEffect(() => {
    if (isFocused) {
      // Start border color animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();

      // Glow effect
      Animated.timing(glowAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      // Stop animations when unfocused
      Animated.timing(glowAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isFocused]);

  // Loading pulse animation
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [isLoading]);

  const animatedBorderColor = borderAnimation.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: ['#FF006E', '#FF1088', '#00F5FF', '#FF006E'],
  });

  const animatedShadowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const animatedShadowRadius = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor: isFocused ? animatedBorderColor : '#333',
            borderWidth: isFocused ? 2 : 1,
            shadowColor: '#FF006E',
            shadowOpacity: animatedShadowOpacity,
            shadowRadius: animatedShadowRadius,
            shadowOffset: { width: 0, height: 0 },
            elevation: isFocused ? 8 : 0,
            transform: [{ scale: pulseAnimation }],
          },
        ]}
      >
        <View style={styles.inputRow}>
          {/* Animated search icon */}
          <Animated.View
            style={{
              transform: [
                {
                  rotate: isLoading
                    ? pulseAnimation.interpolate({
                        inputRange: [1, 1.1],
                        outputRange: ['0deg', '360deg'],
                      })
                    : '0deg',
                },
              ],
            }}
          >
            {isLoading ? (
              <View style={styles.loadingIcon}>
                <Ionicons name="sync" size={20} color="#FF006E" />
              </View>
            ) : (
              <MaskedView
                style={styles.maskedIcon}
                maskElement={
                  <Ionicons name="search" size={20} color="white" />
                }
              >
                <LinearGradient
                  colors={isFocused ? ['#FF006E', '#00F5FF'] : ['#666', '#666']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientIcon}
                />
              </MaskedView>
            )}
          </Animated.View>

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#666"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Clear button with animation */}
          {value.length > 0 && (
            <Animated.View
              style={{
                opacity: borderAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
                transform: [
                  {
                    scale: borderAnimation.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.2, 1],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                onPress={() => onChangeText('')}
                style={styles.clearButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color="#FF006E" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* Animated underline */}
        {isFocused && (
          <Animated.View
            style={[
              styles.underline,
              {
                opacity: glowAnimation,
                backgroundColor: animatedBorderColor,
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Search suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <Animated.View
          style={[
            styles.suggestionsContainer,
            {
              opacity: glowAnimation,
              transform: [
                {
                  translateY: glowAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.suggestionsTitle}>Try searching for:</Text>
          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => onChangeText(suggestion)}
              >
                <LinearGradient
                  colors={['#FF006E20', '#00F5FF20']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.suggestionGradient}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Loading indicator text */}
      {isLoading && (
        <Animated.View
          style={[
            styles.loadingTextContainer,
            {
              opacity: pulseAnimation.interpolate({
                inputRange: [1, 1.1],
                outputRange: [0.5, 1],
              }),
            },
          ]}
        >
          <Text style={styles.loadingText}>AI is thinking...</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  searchContainer: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    position: 'relative',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  maskedIcon: {
    width: 20,
    height: 20,
  },
  gradientIcon: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  suggestionsContainer: {
    marginTop: 12,
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  suggestionGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
  },
  suggestionText: {
    fontSize: 13,
    color: '#AAA',
  },
  loadingTextContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#FF006E',
    fontStyle: 'italic',
  },
});
