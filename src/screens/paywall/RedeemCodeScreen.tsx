import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';

function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
}

export default function RedeemCodeScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const initial = route?.params?.code ? String(route.params.code) : '';

  const [code, setCode] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initial) setCode(initial);
  }, [initial]);

  const normalized = useMemo(() => normalizeCode(code), [code]);

  const onRedeem = async () => {
    const c = normalizeCode(code);
    if (c.length < 8) {
      Alert.alert('Invalid code', 'Please enter the full code from the email.');
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        Alert.alert('Not signed in', 'Please sign in to the app first, then redeem your code.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('claim-pro', {
        body: { code: c },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) {
        Alert.alert('Redeem failed', error.message || 'Please try again.');
        return;
      }

      if (!data?.ok) {
        Alert.alert('Redeem failed', data?.error || 'Please try again.');
        return;
      }

      Alert.alert(
        'Success',
        `FL4SH Pro unlocked.\n\nExpiry: ${data?.expiresAt || '—'}\n\nIf your account doesn’t update immediately, close and reopen the app.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert('Redeem failed', e?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Redeem code</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Paste the code from the email to unlock Pro.</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="ABCD-EFGH-IJKL-MNOP"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
      />

      <Text style={[styles.hint, { color: colors.textSecondary }]}>{normalized ? `Code: ${normalized}` : ''}</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
        onPress={onRedeem}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Redeeming…' : 'Redeem'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { marginTop: 8, fontSize: 12 },
  button: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
