import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useAuth } from '../../contexts/AuthContext';
import { configureRevenueCat, getOfferingPackagePricing, type OfferingPackagePricing } from '../../services/revenueCatService';

type BillingPeriod = 'monthly' | 'annual';

const PRIVACY_URL = 'https://www.fl4shcards.com/privacy/';
const TERMS_URL = 'https://www.fl4shcards.com/terms/';
const CONTACT_URL = 'https://www.fl4shcards.com/contact/';

export default function PaywallScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { tier, purchasePlan, restorePurchases } = useSubscription();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [pricing, setPricing] = useState<Record<string, OfferingPackagePricing>>({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingNote, setPricingNote] = useState<string | null>(null);

  const premiumCta = billing === 'annual' ? 'Start Premium Trial' : 'Start Premium';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setPricingLoading(true);
      setPricingNote(null);

      // Prices require a store build (TestFlight/App Store) because they come from StoreKit via RevenueCat.
      if (Platform.OS === 'web') {
        if (mounted) {
          setPricing({});
          setPricingNote('Prices are available in the App Store build.');
        }
        setPricingLoading(false);
        return;
      }

      const apiKey =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
          : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
            : undefined;

      if (!apiKey) {
        if (mounted) {
          setPricing({});
          setPricingNote('Prices are available in the store build.');
        }
        setPricingLoading(false);
        return;
      }

      // Ensure RevenueCat is configured before attempting to fetch offerings/prices.
      await configureRevenueCat({ apiKey, appUserId: user?.id });

      const map = await getOfferingPackagePricing('default');
      if (mounted) {
        setPricing(map);
        if (!map || Object.keys(map).length === 0) {
          setPricingNote('Prices unavailable. Please try again in a moment, or restore purchases.');
        }
      }
      setPricingLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const formatCurrency = (amount: number, currencyCode: string): string => {
    try {
      // RN Hermes supports Intl in modern Expo builds; fall back gracefully if unavailable.
      // eslint-disable-next-line no-undef
      if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode }).format(amount);
      }
    } catch {
      // ignore
    }
    return `${amount.toFixed(2)} ${currencyCode}`;
  };

  const getPriceLine = (plan: 'premium' | 'pro', bill: BillingPeriod): string => {
    const key = `${plan}_${bill}`;
    const p = pricing[key];
    if (!p?.priceString) return pricingLoading ? 'Loading price…' : 'Price unavailable';

    if (bill === 'monthly') {
      return `${p.priceString} / month`;
    }

    // Annual: show per-unit equivalent if possible (Apple guideline 3.1.2).
    if (typeof p.price === 'number' && p.currencyCode) {
      const perMonth = p.price / 12;
      const perMonthStr = formatCurrency(perMonth, p.currencyCode);
      return `${p.priceString} / year (≈ ${perMonthStr} / month)`;
    }

    return `${p.priceString} / year`;
  };

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
            <Text style={styles.billingHint}>
              {billing === 'annual' ? 'Billed yearly' : 'Billed monthly'} • Prices pulled from{' '}
              {Platform.OS === 'ios' ? 'the App Store' : Platform.OS === 'android' ? 'Google Play' : 'the store'}
            </Text>
            {pricingLoading && (
              <View style={styles.pricingLoadingRow}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={styles.pricingLoadingText}>Fetching current prices…</Text>
              </View>
            )}
            {!!pricingNote && <Text style={styles.pricingNote}>{pricingNote}</Text>}
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
                <Text style={styles.planPrice}>{getPriceLine('premium', billing)}</Text>
                <View style={styles.featureList}>
                  <Feature text="Unlimited subjects" />
                  <Feature text="Unlimited flashcards" />
                  <Feature text="All topics" />
                  <Feature text="Smart revision scheduling" />
                  <Feature text="Priority support" />
                </View>

                {tier === 'free' ? (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => purchasePlan('premium', billing)}
                  >
                    <LinearGradient colors={colors.buttonGradient as any} style={styles.primaryBtnBg}>
                      <Text style={styles.primaryBtnText}>{premiumCta}</Text>
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
                <Text style={styles.planPrice}>{getPriceLine('pro', billing)}</Text>
                <View style={styles.featureList}>
                  <Feature text="Everything in Premium" />
                  <Feature text="Past Papers & mark schemes" />
                  <Feature text="AI marking & insights" />
                  <Feature text="AI card generation" />
                  <Feature text="Advanced analytics" />
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={() => purchasePlan('pro', billing)}>
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
            <View style={styles.linksRow}>
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSep}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={styles.linkText}>Terms of Use (EULA)</Text>
              </TouchableOpacity>
              <Text style={styles.linkSep}>•</Text>
              <TouchableOpacity onPress={() => Linking.openURL(CONTACT_URL)}>
                <Text style={styles.linkText}>Contact</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.legal}>
              Subscriptions renew automatically unless cancelled at least 24 hours before the end of the period. Manage or
              cancel in your {Platform.OS === 'ios' ? 'App Store' : Platform.OS === 'android' ? 'Google Play' : 'store'}{' '}
              settings.
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
    pricingLoadingRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    pricingLoadingText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    pricingNote: { marginTop: 8, color: 'rgba(148,163,184,0.85)', fontSize: 12, textAlign: 'center', maxWidth: 360 },

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
    planPrice: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: -6, marginBottom: 10 },
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
    linksRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    linkText: { color: 'rgba(0,245,255,0.95)', fontSize: 12, fontWeight: '800' },
    linkSep: { color: 'rgba(148,163,184,0.85)', fontSize: 12, fontWeight: '800' },
    legal: { marginTop: 6, color: 'rgba(148,163,184,0.85)', fontSize: 11, textAlign: 'center', maxWidth: 360 },
  });
}


