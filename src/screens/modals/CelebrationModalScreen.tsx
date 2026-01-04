import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

type Params = {
  title?: string;
  message?: string;
  badge?: string;
  ctaLabel?: string;
};

export default function CelebrationModalScreen({ navigation }: any) {
  const route = useRoute();
  const params = (route.params || {}) as Params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const title = params.title || 'Upgraded!';
  const message = params.message || 'Your subscription is now active.';
  const badge = params.badge || null;
  const ctaLabel = params.ctaLabel || 'Continue';

  return (
    <View style={styles.backdrop}>
      <LinearGradient colors={['rgba(0,245,255,0.12)', 'rgba(255,0,110,0.10)', 'rgba(11,18,32,0.98)']} style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="sparkles" size={30} color="#00F5FF" />
        </View>

        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.cta} onPress={() => navigation.goBack()}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#0B1220" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Close</Text>
        </TouchableOpacity>

        <Text style={styles.finePrint}>
          You can manage or cancel your subscription in {Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}.
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
    badge: {
      alignSelf: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,0,110,0.35)',
      backgroundColor: 'rgba(255,0,110,0.12)',
      marginBottom: 10,
    },
    badgeText: {
      color: '#FF4FD8',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
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
      paddingVertical: 10,
      alignItems: 'center',
    },
    secondaryText: {
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
  });
}

