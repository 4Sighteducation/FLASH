import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { navigateToPaywall } from '../../utils/upgradePrompt';

export default function TrialExpiredScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const onUpgrade = () => {
    // Prefer paywall modal
    navigateToPaywall(undefined, { source: 'trial_expired_modal' });
  };

  const onContinueFree = () => {
    Alert.alert(
      'Reset your study set-up?',
      'Your free Pro access has ended.\n\nIf you continue on Free, your cards and progress from the trial will be reset.\n\nYou can avoid the reset by upgrading now.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View plans', onPress: onUpgrade },
        {
          text: busy ? 'Resetting…' : 'Continue on Free',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setBusy(true);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData?.session?.access_token;
              if (!token) throw new Error('Missing session');

              const { data, error } = await supabase.functions.invoke('process-trial-expiry', {
                body: {},
                headers: { Authorization: `Bearer ${token}` },
              } as any);
              if (error) throw error;
              if (!data?.ok) throw new Error(data?.error || 'Reset failed');

              Alert.alert('Reset complete', 'You are now on the Free plan.');
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Could not reset', e?.message || 'Please try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Your free Pro month ended</Text>
        <Text style={styles.body}>
          Upgrade to keep Pro features. If you continue on Free, your trial cards and progress will be reset.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={onUpgrade} disabled={busy}>
          <Text style={styles.primaryBtnText}>View plans</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onContinueFree} disabled={busy}>
          {busy ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryBtnText}>Continue on Free</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.70)',
      justifyContent: 'center',
      padding: 18,
    },
    card: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: '#0B1220',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    title: { color: colors.text, fontSize: 18, fontWeight: '900' },
    body: { marginTop: 10, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
    primaryBtn: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    primaryBtnText: { color: '#0B1220', fontWeight: '900' },
    secondaryBtn: {
      marginTop: 10,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    secondaryBtnText: { color: colors.text, fontWeight: '900' },
  });

