import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SignUpScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Terms Required', 'Please agree to the Terms & Conditions and Privacy Policy to continue');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password, username);
    setLoading(false);

    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else {
      Alert.alert('Success', 'Account created! Please check your email to verify your account.');
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
            <Text style={styles.tagline}>Create Your Account</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#94A3B8"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password (min 6 characters)"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Terms & Privacy Agreement */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={loading}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL('https://4sighteducation.github.io/FLASH/privacy-policy');
                  }}
                >
                  Terms & Conditions
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL('https://4sighteducation.github.io/FLASH/privacy-policy');
                  }}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (loading || !agreedToTerms) && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading || !agreedToTerms}
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
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Already have an account? <Text style={styles.linkTextBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
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
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: width * 0.6,
    height: 120,
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
  vespaLogoSmall: {
    width: 120,
    height: 40,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#00D4FF',
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00D4FF',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  termsLink: {
    color: '#00D4FF',
    textDecorationLine: 'underline',
  },
}); 