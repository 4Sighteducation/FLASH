import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { socialAuth } from '../../services/socialAuth';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { signIn } = useAuth();

  // Clear any stale auth tokens on mount
  useEffect(() => {
    const clearStaleTokens = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const authKeys = keys.filter(key => 
          key.includes('supabase') || 
          key.includes('auth') || 
          key.includes('token')
        );
        
        if (authKeys.length > 0) {
          console.log('Clearing stale auth tokens...');
          await AsyncStorage.multiRemove(authKeys);
        }
      } catch (error) {
        console.error('Error clearing tokens:', error);
      }
    };

    clearStaleTokens();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    try {
      // Clear any existing tokens before login to prevent refresh token errors
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('token')
      );
      
      if (authKeys.length > 0) {
        await AsyncStorage.multiRemove(authKeys);
      }
      
      const { error } = await signIn(email, password);
      
      if (error) {
        // Handle specific auth errors
        if (error.message?.includes('Invalid Refresh Token') || 
            error.message?.includes('Already Used')) {
          Alert.alert(
            'Session Error', 
            'Your session has expired. Please try logging in again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Login Error', error.message);
        }
      }
    } catch (error: any) {
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'tiktok' | 'snapchat') => {
    setSocialLoading(provider);
    
    try {
      const { error } = await socialAuth.signInWithProvider(provider);
      
      if (error) {
        if (error.message !== 'Authentication cancelled') {
          Alert.alert('Login Error', error.message);
        }
      }
    } catch (error: any) {
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const openVespaWebsite = () => {
    Linking.openURL('https://www.vespa.academy');
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/flashtransparent.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>AI-Powered Study Flashcards</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !socialLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading && !socialLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || socialLoading) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || !!socialLoading}
            >
              <LinearGradient
                colors={['#00D4FF', '#00B4E6']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Social Login Section */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity
                style={[styles.socialButton, socialLoading === 'google' && styles.socialButtonActive]}
                onPress={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#EA4335" style={{ marginRight: 8 }} />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonSecondary, socialLoading === 'tiktok' && styles.socialButtonActive]}
                onPress={() => handleSocialLogin('tiktok')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'tiktok' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="musical-notes" size={20} color="#00D4FF" />
                    <Text style={[styles.socialButtonText, styles.socialButtonTextSecondary]}>
                      Continue with TikTok
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonSecondary, socialLoading === 'snapchat' && styles.socialButtonActive]}
                onPress={() => handleSocialLogin('snapchat')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'snapchat' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="logo-snapchat" size={20} color="#00D4FF" />
                    <Text style={[styles.socialButtonText, styles.socialButtonTextSecondary]}>
                      Continue with Snapchat
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('SignUp')}
              disabled={loading || !!socialLoading}
            >
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkTextBold}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* VESPA Academy Footer */}
          <TouchableOpacity 
            style={styles.vespaContainer}
            onPress={openVespaWebsite}
            activeOpacity={0.8}
          >
            <Text style={styles.vespaText}>brought to you by</Text>
            <Image
              source={require('../../../assets/vespalogo.png')}
              style={styles.vespaLogo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: width * 0.7,
    height: 160,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  linkTextBold: {
    color: '#00D4FF',
    fontWeight: '600',
  },
  vespaContainer: {
    alignItems: 'center',
    opacity: 0.7,
  },
  vespaText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  vespaLogo: {
    width: 120,
    height: 40,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  socialIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  socialButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  socialButtonTextSecondary: {
    color: '#00D4FF',
  },
}); 