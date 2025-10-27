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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: Platform.OS === 'web' 
          ? window.location.origin + '/reset-password'
          : 'flash://reset-password',
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
                source={require('../../../assets/flashv2.png')}
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
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                secureTextEntry
                editable={!loading && !socialLoading}
              />
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
              {/* Google - Works on all platforms */}
              <TouchableOpacity
                style={[styles.socialButton, socialLoading === 'google' && styles.socialButtonActive]}
                onPress={() => handleSocialLogin('google')}
                disabled={!!socialLoading || loading}
              >
                <View style={styles.socialButtonContent}>
                  {socialLoading === 'google' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#fff" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>Google</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Microsoft - Works on all platforms */}
              <TouchableOpacity
                style={[styles.socialButton, socialLoading === 'microsoft' && styles.socialButtonActive]}
                onPress={() => handleSocialLogin('microsoft')}
                disabled={!!socialLoading || loading}
              >
                <View style={styles.socialButtonContent}>
                  {socialLoading === 'microsoft' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-microsoft" size={20} color="#fff" style={styles.socialIcon} />
                      <Text style={styles.socialButtonText}>Microsoft</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>

              {/* Apple - iOS/Android only */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.socialButton, styles.socialButtonApple, socialLoading === 'apple' && styles.socialButtonActive]}
                  onPress={() => handleSocialLogin('apple')}
                  disabled={!!socialLoading || loading}
                >
                  <View style={styles.socialButtonContent}>
                    {socialLoading === 'apple' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="logo-apple" size={20} color="#fff" style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Apple</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              )}

              {/* Phone - Mobile only */}
              {Platform.OS !== 'web' && (
                <TouchableOpacity
                  style={[styles.socialButton, socialLoading === 'phone' && styles.socialButtonActive]}
                  onPress={() => setShowPhoneAuth(true)}
                  disabled={!!socialLoading || loading}
                >
                  <View style={styles.socialButtonContent}>
                    {socialLoading === 'phone' ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="call" size={20} color="#fff" style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Phone</Text>
                      </>
                    )}
                  </View>
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

            {/* Terms & Privacy Links */}
            <View style={styles.legalLinksContainer}>
              <TouchableOpacity onPress={() => Linking.openURL('https://4sighteducation.github.io/FLASH/privacy-policy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://4sighteducation.github.io/FLASH/privacy-policy')}>
                <Text style={styles.legalLink}>Terms & Conditions</Text>
              </TouchableOpacity>
            </View>
          </View>


        </View>
      </KeyboardAvoidingView>

      <PhoneAuthModal 
        visible={showPhoneAuth}
        onClose={() => setShowPhoneAuth(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Pure black like marketing site
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGlow: {
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: width * 0.5,
    height: 140,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)', // Subtle cyan tint
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)', // Neon cyan border
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
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
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialButtonsContainer: {
    gap: 12,
    marginBottom: 32,
  },
  socialButton: {
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.3)',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  socialButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    marginRight: 10,
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  socialButtonActive: {
    backgroundColor: 'rgba(0, 245, 255, 0.2)',
    borderColor: '#00F5FF',
  },
  socialButtonApple: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  signupContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  signupText: {
    color: '#94A3B8',
    fontSize: 15,
    marginBottom: 12,
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF006E', // Pink like marketing site
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
  },
  createAccountText: {
    color: '#FF006E',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
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