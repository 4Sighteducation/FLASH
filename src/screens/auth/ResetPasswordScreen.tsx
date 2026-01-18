import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../navigation/RootNavigation';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPasswordScreen() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!password || !confirm) return false;
    if (password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Reset Failed', error.message || 'Unable to reset password.');
        return;
      }

      Alert.alert('Password updated', 'Your password has been updated. Please log in with your new password.', [
        {
          text: 'OK',
          onPress: async () => {
            try {
              // For safety, sign out so we return to a clean login state.
              await supabase.auth.signOut();
            } catch {}
            navigate('Login' as never);
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Reset Failed', e?.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter a new password for your FLASH account.
        </Text>

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="New password (min 8 characters)"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowPassword((v) => !v)}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#94A3B8"
          />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Confirm new password"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.passwordToggle}
          onPress={() => setShowConfirm((v) => !v)}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={showConfirm ? 'Hide password confirmation' : 'Show password confirmation'}
        >
          <Ionicons
            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color="#94A3B8"
          />
        </TouchableOpacity>

        {password.length > 0 && password.length < 8 ? (
          <Text style={styles.hint}>Password must be at least 8 characters.</Text>
        ) : null}
        {confirm.length > 0 && password !== confirm ? (
          <Text style={styles.hint}>Passwords do not match.</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, (!canSubmit || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
        >
          <LinearGradient
            colors={['#00D4FF', '#00B4E6']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update password</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footer}>
          If you didn’t request this, you can close this screen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    justifyContent: 'center',
    padding: 20,
    ...(Platform.OS === 'web' ? ({ minHeight: '100vh' } as any) : null),
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.06)',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.18)',
    borderRadius: 14,
    padding: 18,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 14,
  },
  input: {
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(0, 245, 255, 0.20)',
    marginBottom: 10,
  },
  passwordToggle: {
    alignSelf: 'flex-end',
    marginTop: -46,
    marginBottom: 18,
    padding: 10,
  },
  hint: {
    color: '#FF006E',
    fontSize: 12,
    marginBottom: 10,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#00F5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
});

