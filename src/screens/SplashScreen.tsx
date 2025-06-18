import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/flashtransparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator 
          size="large" 
          color="#00D4FF" 
          style={styles.loader}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: 160,
    marginBottom: 50,
  },
  loader: {
    marginTop: 20,
  },
}); 