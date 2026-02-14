import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import Constants from 'expo-constants';
import { useTheme } from '../../contexts/ThemeContext';
import { markOptedOut, markReviewed } from '../../utils/reviewPrompt';

export default function ReviewPromptModalScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const close = () => navigation.goBack();

  const openStoreListingFallback = async () => {
    let url: string | null = null;
    try {
      url = StoreReview.storeUrl?.() ?? null;
    } catch {
      url = null;
    }

    if (!url && Platform.OS === 'android') {
      const pkg =
        (Constants.expoConfig as any)?.android?.package ||
        (Constants.manifest as any)?.android?.package ||
        null;
      if (pkg) {
        url = `https://play.google.com/store/apps/details?id=${pkg}`;
      }
    }

    if (url) {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    }
  };

  const handleYes = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const available = await StoreReview.isAvailableAsync();
      if (available) {
        await StoreReview.requestReview();
      } else {
        await openStoreListingFallback();
      }
      await markReviewed();
      close();
    } catch {
      // If the native prompt fails for any reason, just close quietly.
      await markReviewed();
      close();
    } finally {
      setBusy(false);
    }
  };

  const handleNotReally = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Don’t ask again if they’re unhappy; route to feedback instead.
      await markOptedOut();
      close();
      navigation.navigate('FeedbackModal', {
        mode: 'feedback',
        contextTitle: 'Quick feedback',
        contextHint: 'What could we do to make FL4SH better for you?',
        defaultCategory: 'feature',
        sourceRouteName: 'ReviewPromptModal',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = async () => {
    // We already increment promptCount when we show the modal (App.tsx).
    close();
  };

  return (
    <View style={styles.backdrop}>
      <LinearGradient colors={['rgba(0,245,255,0.10)', 'rgba(255,0,110,0.08)', 'rgba(11,18,32,0.98)']} style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="star" size={28} color="#00F5FF" />
        </View>

        <Text style={styles.title}>Enjoying FL4SH?</Text>
        <Text style={styles.message}>
          A quick review helps more students find the app. If you’re enjoying it, would you mind leaving a review?
        </Text>

        <TouchableOpacity style={[styles.cta, busy && styles.disabled]} onPress={handleYes} disabled={busy}>
          <Text style={styles.ctaText}>Yes — leave a review</Text>
          <Ionicons name="arrow-forward" size={18} color="#0B1220" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondary, busy && styles.disabled]} onPress={handleNotReally} disabled={busy}>
          <Text style={styles.secondaryText}>Not really</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tertiary, busy && styles.disabled]} onPress={handleNotNow} disabled={busy}>
          <Text style={styles.tertiaryText}>Not now</Text>
        </TouchableOpacity>

        <Text style={styles.finePrint}>
          The review prompt may not always appear (Apple/Google controls how often it can show).
        </Text>
      </LinearGradient>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.68)',
      justifyContent: 'center',
      padding: 18,
    },
    card: {
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.10)',
      backgroundColor: 'rgba(11,18,32,0.98)',
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,245,255,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.25)',
      alignSelf: 'center',
      marginBottom: 12,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },
    message: {
      marginTop: 10,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 18,
    },
    cta: {
      marginTop: 16,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: '#00F5FF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ctaText: {
      color: '#0B1220',
      fontSize: 15,
      fontWeight: '900',
    },
    secondary: {
      marginTop: 10,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    secondaryText: {
      color: colors.text,
      fontWeight: '900',
    },
    tertiary: {
      marginTop: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tertiaryText: {
      color: colors.textSecondary,
      fontWeight: '800',
    },
    finePrint: {
      marginTop: 8,
      color: 'rgba(148,163,184,0.85)',
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 16,
    },
    disabled: { opacity: 0.6 },
  });
}

