import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SplashScreen({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    if (!onReady) return;
    const timer = setTimeout(onReady, 2000);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <LinearGradient
      colors={['#0a0f1e', '#0F172A']}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoGlow}>
        <Image
            source={require('../../assets/flash-logo-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        </View>
        <ActivityIndicator 
          size="large" 
          color="#00F5FF" 
          style={styles.loader}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoGlow: {
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 40,
  },
  logo: {
    width: width * 0.7,
    height: 150,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
}); 