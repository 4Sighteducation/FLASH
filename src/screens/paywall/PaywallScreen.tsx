import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

type BillingPeriod = 'monthly' | 'annual';

export default function PaywallScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tier, purchaseFullVersion, restorePurchases } = useSubscription();
  const [billing, setBilling] = useState<BillingPeriod>('annual');

  // For v1 screenshots + App Review metadata: avoid hardcoding prices (they vary by region/currency).
  const priceHint = billing === 'annual' ? 'Billed yearly' : 'Billed monthly';

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={colors.gradient as any} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.brand}>
              <Image source={require('../../../assets/icon.png')} style={styles.logo} />
              <Text style={styles.title}>Upgrade your study setup</Text>
              <Text style={styles.subtitle}>
                Choose a plan. Start with{' '}
                <Text style={styles.subtitleStrong}>Premium</Text> (14‑day free trial), or unlock
                everything with <Text style={[styles.subtitleStrong, { color: colors.secondary }]}>Pro</Text>.
              </Text>
            </View>
          </View>

          <View style={styles.billingToggleWrap}>
            <View style={styles.billingToggle}>
              <TouchableOpacity
                onPress={() => setBilling('monthly')}
                style={[styles.billingPill, billing === 'monthly' && styles.billingPillActive]}
              >
                <Text style={[styles.billingText, billing === 'monthly' && styles.billingTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBilling('annual')}
                style={[styles.billingPill, billing === 'annual' && styles.billingPillActive]}
              >
                <Text style={[styles.billingText, billing === 'annual' && styles.billingTextActive]}>
                  Annual
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.billingHint}>{priceHint} • Price shown at checkout</Text>
          </View>

          <View style={styles.cards}>
            {/* Free */}
            <View style={styles.cardOuter}>
              <View style={[styles.card, styles.cardMuted]}>
                <Text style={styles.cardTitle}>Free</Text>
                <Text style={styles.priceLine}>
                  <Text style={styles.priceBig}>£0</Text>
                  <Text style={styles.priceSmall}> / forever</Text>
                </Text>
                <View style={styles.featureList}>
                  <Feature text="1 subject" />
                  <Feature text="10 flashcards" />
                  <Feature text="Basic study mode" />
                  <Feature text="Progress tracking" />
                </View>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.secondaryBtnText}>Keep Free</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Premium */}
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.cardOuterGlow}>
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>Premium</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>14‑DAY TRIAL</Text>
                  </View>
                </View>
                <Text style={styles.priceLine}>
                  <Text style={styles.priceBig}>Premium</Text>
                  <Text style={styles.priceSmall}> • Unlimited study essentials</Text>
                </Text>
                <View style={styles.featureList}>
                  <Feature text="Unlimited subjects" />
                  <Feature text="Unlimited flashcards" />
                  <Feature text="All topics" />
                  <Feature text="Offline mode" />
                  <Feature text="Priority support" />
                </View>

                {tier === 'free' ? (
                  <TouchableOpacity style={styles.primaryBtn} onPress={purchaseFullVersion}>
                    <LinearGradient colors={colors.buttonGradient as any} style={styles.primaryBtnBg}>
                      <Text style={styles.primaryBtnText}>Start Premium Trial</Text>
                      <Ionicons name="arrow-forward" size={18} color="#0B1220" />
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.currentPill}>
                    <Text style={styles.currentPillText}>You’re already upgraded</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Pro */}
            <LinearGradient colors={['rgba(255,0,110,0.55)', 'rgba(0,245,255,0.35)']} style={styles.cardOuterGlow}>
              <View style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle}>Pro</Text>
                  <View style={[styles.badge, styles.badgePro]}>
                    <Text style={styles.badgeText}>BEST VALUE</Text>
                  </View>
                </View>
                <Text style={styles.priceLine}>
                  <Text style={styles.priceBig}>Pro</Text>
                  <Text style={styles.priceSmall}> • Everything in Premium + Papers + AI</Text>
                </Text>
                <View style={styles.featureList}>
                  <Feature text="Everything in Premium" />
                  <Feature text="Past Papers & mark schemes" />
                  <Feature text="AI marking & insights" />
                  <Feature text="AI card generation" />
                  <Feature text="Advanced analytics" />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={purchaseFullVersion}>
                  <LinearGradient
                    colors={[colors.secondary, colors.primary] as any}
                    style={styles.primaryBtnBg}
                  >
                    <Text style={styles.primaryBtnText}>Go Pro</Text>
                    <Ionicons name="flash" size={18} color="#0B1220" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.restoreRow} onPress={restorePurchases}>
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
              <Text style={styles.restoreText}>Restore purchases</Text>
            </TouchableOpacity>
            <Text style={styles.legal}>
              Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <Ionicons name="checkmark-circle" size={18} color="rgba(0,245,255,0.9)" />
      <Text style={{ color: '#E2E8F0', marginLeft: 8, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    content: { paddingBottom: 28 },
    header: { paddingHorizontal: 18, paddingTop: 10 },
    back: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.25)',
      backgroundColor: 'rgba(0,245,255,0.06)',
    },
    brand: { marginTop: 12, alignItems: 'center' },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,0,110,0.35)',
      backgroundColor: 'rgba(0,0,0,0.25)',
    },
    title: { color: colors.text, fontSize: 22, fontWeight: '800' },
    subtitle: {
      marginTop: 8,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
      fontSize: 13,
      maxWidth: 340,
    },
    subtitleStrong: { color: colors.primary, fontWeight: '800' },

    billingToggleWrap: { paddingHorizontal: 18, marginTop: 14, alignItems: 'center' },
    billingToggle: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.22)',
      backgroundColor: 'rgba(0,245,255,0.05)',
    },
    billingPill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
    billingPillActive: {
      backgroundColor: 'rgba(255,0,110,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,0,110,0.38)',
    },
    billingText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    billingTextActive: { color: colors.text },
    billingHint: { marginTop: 8, color: colors.textSecondary, fontSize: 12 },

    cards: { paddingHorizontal: 18, marginTop: 16, gap: 14 },
    cardOuter: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.22)',
      backgroundColor: 'rgba(15,23,42,0.55)',
    },
    cardOuterGlow: {
      borderRadius: 18,
      padding: 1.2,
      ...Platform.select({
        ios: { shadowColor: colors.secondary, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
        android: { elevation: 6 },
      }),
    },
    card: {
      borderRadius: 17,
      padding: 16,
      backgroundColor: 'rgba(11,18,32,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.12)',
    },
    cardMuted: {
      backgroundColor: 'rgba(11,18,32,0.75)',
      borderColor: 'rgba(148,163,184,0.20)',
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.35)',
      backgroundColor: 'rgba(0,245,255,0.10)',
    },
    badgePro: {
      borderColor: 'rgba(255,0,110,0.45)',
      backgroundColor: 'rgba(255,0,110,0.12)',
    },
    badgeText: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
    priceLine: { marginTop: 10, marginBottom: 12 },
    priceBig: { color: colors.text, fontSize: 26, fontWeight: '900' },
    priceSmall: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    featureList: { marginTop: 4, marginBottom: 14 },

    primaryBtn: { borderRadius: 14, overflow: 'hidden' },
    primaryBtnBg: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    primaryBtnText: { color: '#0B1220', fontWeight: '900', fontSize: 15 },
    secondaryBtn: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.25)',
      backgroundColor: 'rgba(148,163,184,0.08)',
    },
    secondaryBtnText: { color: colors.text, fontWeight: '800', fontSize: 14 },
    currentPill: {
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(0,245,255,0.26)',
      backgroundColor: 'rgba(0,245,255,0.08)',
    },
    currentPillText: { color: colors.text, fontWeight: '800' },

    footer: { paddingHorizontal: 18, marginTop: 16, alignItems: 'center' },
    restoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
    restoreText: { color: colors.textSecondary, fontWeight: '700' },
    legal: { marginTop: 6, color: 'rgba(148,163,184,0.85)', fontSize: 11, textAlign: 'center', maxWidth: 360 },
  });
}


