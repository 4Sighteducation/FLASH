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
import * as ExpoLinking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { socialAuth } from '../../services/socialAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
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
      setError('Please fill in all fields');
      return;
    }

    setError('');
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
      
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        // Handle specific auth errors with user-friendly messages
        if (signInError.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else if (signInError.message?.includes('Email not confirmed')) {
          setError('Please check your email and verify your account first.');
        } else if (signInError.message?.includes('Invalid Refresh Token') || 
            signInError.message?.includes('Already Used')) {
          setError('Your session has expired. Please try logging in again.');
        } else {
          setError(signInError.message || 'Login failed. Please try again.');
        }
      }
    } catch (error: any) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address to reset your password');
      return;
    }

    try {
      // IMPORTANT:
      // - On native, use an explicit deep link (stable + predictable) so Supabase emails redirect into the app.
      // - On web, use an https URL (current origin).
      //
      // Note: we intentionally use "triple slash" so expo-linking parses `path === 'reset-password'`
      // (with a double-slash URL, `reset-password` can be treated as the host instead of the path).
      const resetRedirectTo =
        Platform.OS === 'web'
          ? ExpoLinking.createURL('reset-password')
          : 'com.foursighteducation.flash:///reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Linking.createURL works on web (uses current origin) and native (uses the configured scheme).
        redirectTo: resetRedirectTo,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Check Your Email',
          'We\'ve sent you a password reset link. Please check your email.'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
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
      }
      // If there's no error, the deep link handler in App.tsx will take over.
      // The onAuthStateChange listener will navigate the user away from this screen.
      // We just need to handle the loading state.
    } catch (error: any) {
      Alert.alert('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      // The screen will be unmounted on successful login, so this might not even run.
      // If login fails or is cancelled, we should reset the loading state.
      setSocialLoading(null);
    }
  };

  const openVespaWebsite = () => {
    Linking.openURL('https://www.vespa.academy');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoGlow}>
              <Image
                source={Platform.OS === 'web' 
                  ? require('../../../assets/flash-logo-transparent.png')
                  : require('../../../assets/flashv2.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.tagline}>AI-Powered Study Flashcards</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF006E" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !socialLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loading && !socialLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword((v) => !v)}
                  disabled={loading || !!socialLoading}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#94A3B8"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

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
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.socialButtonsContainer}>
              {/* Google - Android + Web only */}
              {Platform.OS !== 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, socialLoading === 'google' && styles.socialButtonActive]}
                  onPress={() => handleSocialLogin('google')}
                  disabled={!!socialLoading || loading}
                >
                  {socialLoading === 'google' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : Platform.OS === 'web' ? (
                    <Text style={styles.socialButtonTextWeb}>G</Text>
                  ) : (
                    <Ionicons name="logo-google" size={24} color="#00F5FF" />
                  )}
                </TouchableOpacity>
              )}

              {/* Microsoft - Web only */}
              {Platform.OS === 'web' && (
                <TouchableOpacity
                  style={[styles.socialButton, socialLoading === 'microsoft' && styles.socialButtonActive]}
                  onPress={() => handleSocialLogin('microsoft')}
                  disabled={!!socialLoading || loading}
                >
                  {socialLoading === 'microsoft' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.socialButtonTextWeb}>M</Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Apple - iOS only */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.socialButtonApple, socialLoading === 'apple' && styles.socialButtonActive]}
                  onPress={() => handleSocialLogin('apple')}
                  disabled={!!socialLoading || loading}
                >
                  {socialLoading === 'apple' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="logo-apple" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              )}

            </View>

            {/* Create Account - PROMINENT */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>New to FLASH?</Text>
              <TouchableOpacity
                style={styles.createAccountButton}
                onPress={() => navigation.navigate('SignUp')}
                disabled={loading || !!socialLoading}
              >
                <Text style={styles.createAccountText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>


        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e', // Dark navy-black with subtle blue tint
    ...(Platform.OS === 'web' && ({
      minHeight: '100vh',
      backgroundImage: `
        linear-gradient(rgba(255, 0, 110, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 0, 110, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    } as any)),
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    ...(Platform.OS === 'web' && ({
      paddingTop: 20,
      paddingBottom: 60,
      minHeight: 'fit-content',
    } as any)),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    ...(Platform.OS === 'web' && {
      marginBottom: 20,
    }),
  },
  logoGlow: {
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 30,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 12,
    ...(Platform.OS === 'web' && {
      backgroundColor: 'transparent',
    }),
  },
  tagline: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 14,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    height: '100%',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.25)',
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 245, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    // Icon only, no text
  },
  socialButtonText: {
    display: 'none', // Hide text on compact icons
  },
  socialButtonActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: '#00F5FF',
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  socialButtonApple: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  socialButtonTextWeb: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00F5FF',
  },

  signupContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  signupText: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 10,
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FF006E',
    paddingVertical: 12,
    paddingHorizontal: 32,
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  createAccountText: {
    color: '#FF006E',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 110, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 110, 0.3)',
  },
  errorText: {
    color: '#FF006E',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#00D4FF',
    fontSize: 14,
    fontWeight: '500',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  legalLink: {
    color: '#64748B',
    fontSize: 11,
  },
  legalDivider: {
    color: '#64748B',
    fontSize: 11,
  },
}); 