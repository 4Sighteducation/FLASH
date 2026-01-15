import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { navigateToPaywall } from '../../utils/upgradePrompt';
import { navigate as rootNavigate } from '../../navigation/RootNavigation';

export default function TrialExpiredScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const dismiss = () => {
    try {
      if (navigation?.canGoBack?.()) {
        navigation.goBack();
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: ensure we land somewhere valid even if this modal was opened "root-first".
    try {
      rootNavigate('Main');
    } catch {
      // ignore
    }
  };

  const onKeepPro = () => {
    // Prefer paywall modal
    navigateToPaywall(undefined, { source: 'trial_expired_modal' });
  };

  const onContinueFree = () => {
    Alert.alert(
      'Switch to Free (and reset)?',
      'You’re currently on Pro for free, but that access has ended.\n\nIf you continue on Free:\n- your trial study set-up will be reset (cards, subjects and progress)\n- Past Papers will be locked\n- you’ll be limited to 1 subject and 10 cards\n\nIf now isn’t the right time, that’s fine — you can stay on Free and come back to Pro whenever you’re ready.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep Pro', onPress: onKeepPro },
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
              dismiss();
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
        <View style={styles.brandRow}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Your free Pro access has ended</Text>
        </View>
        <Text style={styles.body}>
          If you stay on Free, your trial study set-up will be reset (cards, subjects and progress) and Past Papers will be locked.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={onKeepPro} disabled={busy}>
          <Text style={styles.primaryBtnText}>Keep Pro</Text>
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
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,0,110,0.35)',
      backgroundColor: 'rgba(0,0,0,0.25)',
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

