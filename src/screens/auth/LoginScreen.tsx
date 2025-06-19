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
import PhoneAuthModal from '../../components/PhoneAuthModal';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showPhoneAuth, setShowPhoneAuth] = useState(false);
  const { signIn } = useAuth();
  const { colors } = useTheme();

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

  const handleSocialLogin = async (provider: 'google' | 'microsoft' | 'apple') => {
    setSocialLoading(provider);
    
    try {
      const { error } = await socialAuth.signInWithProvider(provider);
      
      if (error) {
        if (error.message !== 'Authentication cancelled') {
          Alert.alert('Login Error', error.message);
        }
      } else {
        // Wait a bit for the deep link to be processed
        console.log('OAuth completed, waiting for session...');
        
        // Give the deep link handler time to process
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.error('No session after OAuth - check Supabase redirect URLs');
            Alert.alert(
              'Authentication Issue', 
              'OAuth completed but session was not established. Please check your internet connection and try again.'
            );
            setSocialLoading(null);
          } else {
            console.log('Session confirmed:', session.user.email);
            // Session exists, auth context should update automatically
          }
        }, 2000); // Increased timeout
      }
    } catch (error: any) {
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      // Clear loading state after 2.5 seconds to allow for session check
      setTimeout(() => {
        setSocialLoading(null);
      }, 2500);
    }
  };

  const openVespaWebsite = () => {
    Linking.openURL('https://www.vespa.academy');
  };

  return (
    <LinearGradient
      colors={colors.gradient}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* VESPA header */}
          <TouchableOpacity 
            style={styles.vespaHeader}
            onPress={openVespaWebsite}
            activeOpacity={0.8}
          >
            <Text style={styles.vespaHeaderText}>brought to you by</Text>
            <Image
              source={require('../../../assets/vespalogo.png')}
              style={styles.vespaLogoSmall}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/flashv2.png')}
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
              <Text style={styles.dividerText}>Sign in with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialIconsContainer}>
              <TouchableOpacity
                style={[styles.socialIconButton, socialLoading === 'google' && styles.socialIconActive]}
                onPress={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator size="small" color="#EA4335" />
                ) : (
                  <Ionicons name="logo-google" size={28} color="#EA4335" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialIconButton, socialLoading === 'microsoft' && styles.socialIconActive]}
                onPress={() => handleSocialLogin('microsoft')}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'microsoft' ? (
                  <ActivityIndicator size="small" color="#0078D4" />
                ) : (
                  <Ionicons name="logo-windows" size={28} color="#0078D4" />
                )}
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialIconButton, styles.socialIconApple, socialLoading === 'apple' && styles.socialIconActive]}
                  onPress={() => handleSocialLogin('apple')}
                  disabled={!!socialLoading || loading}
                >
                  {socialLoading === 'apple' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="logo-apple" size={28} color="#fff" />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.socialIconButton, socialLoading === 'phone' && styles.socialIconActive]}
                onPress={() => setShowPhoneAuth(true)}
                disabled={!!socialLoading || loading}
              >
                {socialLoading === 'phone' ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Ionicons name="call" size={28} color="#10B981" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>New to FLASH?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                disabled={loading || !!socialLoading}
              >
                <Text style={styles.signupLink}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>


        </View>
      </KeyboardAvoidingView>

      <PhoneAuthModal 
        visible={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
      />
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  vespaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  vespaHeaderText: {
    fontSize: 10,
    color: '#64748B',
    marginRight: 6,
  },
  vespaLogoSmall: {
    width: 60,
    height: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: width * 0.85,
    height: 200,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    marginBottom: 20,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 20,
  },
  socialIconButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialIconActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialIconApple: {
    backgroundColor: '#000',
    borderColor: '#000',
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  signupText: {
    color: '#64748B',
    fontSize: 14,
  },
  signupLink: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 