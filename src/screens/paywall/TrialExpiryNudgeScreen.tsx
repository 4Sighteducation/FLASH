import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { navigate } from '../../navigation/RootNavigation';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { navigate as rootNavigate } from '../../navigation/RootNavigation';

type Params = {
  daysRemaining?: number;
  expiresAt?: string;
  source?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TrialExpiryNudgeScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const params: Params = route?.params || {};
  const daysRemaining = typeof params.daysRemaining === 'number' ? params.daysRemaining : undefined;
  const isLastDay = daysRemaining != null && daysRemaining <= 0;

  // Copy: keep it short and scannable (iOS push will always truncate).
  const title = 'Don’t lose your progress — keep studying like a Pro.';
  const firstLine =
    daysRemaining == null
      ? 'Your Pro trial is running.'
      : daysRemaining <= 0
        ? 'Today your Pro trial ends.'
        : daysRemaining === 1
          ? 'Tomorrow your Pro trial ends.'
          : `In ${daysRemaining} days your Pro trial ends.`;
  const body = `${firstLine} Unless you upgrade, your cards, subjects and progress will be deleted — and you’ll be limited to 1 subject, 10 cards and no Past Papers.`;

  // Trial is 30 days. If they have X days remaining, we’ve used 30-X.
  const progress = daysRemaining == null ? 0.7 : clamp((30 - daysRemaining) / 30, 0, 1);

  const onKeepPro = () => {
    // Close this modal, then open the root paywall modal.
    try {
      navigation.goBack();
    } catch {
      // ignore
    }
    setTimeout(() => {
      navigate('PaywallModal', {
        source: params.source || 'trial_expiry_nudge',
        initialBilling: 'annual',
        highlightOffer: true,
      });
    }, 80);
  };

  const onClose = () => {
    if (isLastDay) return; // last-day version should not be dismissible
    navigation.goBack();
  };

  const onContinueFreeReset = () => {
    Alert.alert(
      'Switch to Free (and reset)?',
      'Your Pro trial has ended.\n\nIf you continue on Free:\n- your cards, subjects and progress will be deleted\n- Past Papers will be locked\n- you’ll be limited to 1 subject and 10 cards',
      [
        { text: 'Cancel', style: 'cancel' },
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
              try {
                rootNavigate('Main');
              } catch {
                // ignore
              }
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.backdrop}>
        <View style={styles.cardOuter}>
          <LinearGradient colors={colors.gradient as any} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.brandRow}>
                <Image source={require('../../../assets/icon.png')} style={styles.logo} />
                <Text style={styles.kicker}>Pro access reminder</Text>
              </View>
              {!isLastDay ? (
                <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={styles.closeBtn}>
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>

            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {daysRemaining == null
                  ? 'Trial progress'
                  : daysRemaining <= 0
                    ? 'Last day of free access'
                    : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`}
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={onKeepPro}>
              <LinearGradient colors={colors.buttonGradient as any} style={styles.primaryBtnBg}>
                <Text style={styles.primaryBtnText}>Keep studying like a Pro</Text>
              </LinearGradient>
            </TouchableOpacity>

            {isLastDay ? (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onContinueFreeReset} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.secondaryBtnText}>Continue on Free (reset)</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
                <Text style={styles.secondaryBtnText}>Not now</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    backdrop: {
      flex: 1,
      padding: 18,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    cardOuter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.22)',
      overflow: 'hidden',
    },
    card: {
      padding: 18,
      borderRadius: 18,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,0,110,0.35)',
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.22)',
      backgroundColor: 'rgba(148,163,184,0.08)',
    },
    kicker: { color: 'rgba(226,232,240,0.85)', fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
    title: { marginTop: 14, color: colors.text, fontSize: 24, fontWeight: '900', lineHeight: 28 },
    body: { marginTop: 10, color: colors.textSecondary, fontSize: 16, lineHeight: 22 },
    progressWrap: { marginTop: 14 },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: 'rgba(148,163,184,0.22)',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.18)',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.secondary,
    },
    progressText: { marginTop: 8, color: 'rgba(226,232,240,0.86)', fontSize: 12, fontWeight: '800' },
    primaryBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
    primaryBtnBg: { paddingVertical: 12, alignItems: 'center' },
    primaryBtnText: { color: '#0B1220', fontWeight: '900', fontSize: 15 },
    secondaryBtn: {
      marginTop: 10,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.22)',
      backgroundColor: 'rgba(148,163,184,0.08)',
    },
    secondaryBtnText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  });
}

