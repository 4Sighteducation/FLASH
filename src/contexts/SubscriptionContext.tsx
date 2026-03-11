import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, AppState } from 'react-native';
// import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import {
  addCustomerInfoListener,
  configureRevenueCat,
  getCustomerInfo,
  getExpirationIso,
  purchaseFromOffering,
  restorePurchases as rcRestorePurchases,
  resolveTierFromCustomerInfo,
  type BillingPeriod,
  type Plan,
} from '../services/revenueCatService';
import { navigate as rootNavigate } from '../navigation/RootNavigation';

// v1 tiers: Free / Premium / Pro
// NOTE: We keep backwards-compatibility with legacy values stored in DB/storage ('lite'/'full').
export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type SubscriptionSource = 'trial' | 'revenuecat' | 'beta' | 'code' | 'free' | 'unknown' | null;

export type SubscriptionMeta = {
  source: SubscriptionSource;
  startedAt: string | null;
  expiresAt: string | null;
  expiredProcessedAt: string | null;
};

export type TrialInfo = {
  isTrial: boolean;
  isActive: boolean;
  totalDays: number;
  daysRemaining: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  progress: number | null; // 0..1
};

interface SubscriptionLimits {
  maxSubjects: number;
  maxTopicsPerSubject: number;
  maxCards: number;
  canUseAI: boolean;
  canExportCards: boolean;
  canUseVoiceAnswers: boolean;
  canAccessPapers: boolean;
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  subscription: SubscriptionMeta;
  trial: TrialInfo;
  limits: SubscriptionLimits;
  isLoading: boolean;
  purchasePlan: (plan: Plan, billing: BillingPeriod) => Promise<void>;
  restorePurchases: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  checkLimits: (type: 'subject' | 'topic' | 'card', currentCount: number) => boolean;
}

const subscriptionLimits: Record<SubscriptionTier, SubscriptionLimits> = {
  free: {
    maxSubjects: 1,
    maxTopicsPerSubject: 1,
    maxCards: 10,
    // Core AI card generation is available on all tiers (main value prop).
    canUseAI: true,
    canExportCards: false,
    canUseVoiceAnswers: false,
    canAccessPapers: false,
  },
  premium: {
    maxSubjects: -1, // Unlimited
    maxTopicsPerSubject: -1,
    maxCards: -1,
    canUseAI: true,
    canExportCards: true,
    // Transition safety: legacy Premium should behave like Pro (Premium is no longer sold).
    canUseVoiceAnswers: true,
    canAccessPapers: true,
  },
  pro: {
    maxSubjects: -1,
    maxTopicsPerSubject: -1,
    maxCards: -1,
    canUseAI: true,
    canExportCards: true,
    canUseVoiceAnswers: true,
    canAccessPapers: true,
  },
};

// Product IDs for different platforms
const PRODUCT_IDS = {
  ios: 'com.foursighteducation.flash.full',
  android: 'flash_full_version',
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [subscription, setSubscription] = useState<SubscriptionMeta>({
    source: null,
    startedAt: null,
    expiresAt: null,
    expiredProcessedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const unsubscribeRef = React.useRef<null | (() => void)>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const tierStorageKey = (userId?: string | null) => `subscriptionTier:${userId || 'anon'}`;
  const launchOfferPendingKey = (userId?: string | null) => `launch_offer_pending_v1:${userId || 'anon'}`;
  const celebrationKey = (userId?: string | null) => `celebration_pending_v1:${userId || 'anon'}`;

  // Pro-only model: treat any legacy Premium as Pro.
  const tierRank = (t: SubscriptionTier) => (t === 'pro' || t === 'premium' ? 2 : 0);

  const TRIAL_TOTAL_DAYS = 30;
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const computeTrialInfo = (meta: SubscriptionMeta): TrialInfo => {
    const isTrial = String(meta.source || '') === 'trial' && !!meta.expiresAt;
    const expiresAtMs = meta.expiresAt ? Date.parse(meta.expiresAt) : NaN;
    const startedAtMs = meta.startedAt ? Date.parse(meta.startedAt) : NaN;
    const now = nowMs;

    const isActive = isTrial && Number.isFinite(expiresAtMs) && expiresAtMs > now;

    const daysRemaining =
      isTrial && Number.isFinite(expiresAtMs)
        ? Math.max(0, Math.ceil((expiresAtMs - now) / (24 * 60 * 60 * 1000)))
        : null;

    const progress = (() => {
      if (!isTrial) return null;
      if (Number.isFinite(startedAtMs) && Number.isFinite(expiresAtMs) && expiresAtMs > startedAtMs) {
        const p = (now - startedAtMs) / (TRIAL_TOTAL_DAYS * 24 * 60 * 60 * 1000);
        return clamp01(p);
      }
      if (typeof daysRemaining === 'number') {
        return clamp01((TRIAL_TOTAL_DAYS - daysRemaining) / TRIAL_TOTAL_DAYS);
      }
      return null;
    })();

    return {
      isTrial,
      isActive,
      totalDays: TRIAL_TOTAL_DAYS,
      daysRemaining,
      startedAt: meta.startedAt,
      expiresAt: meta.expiresAt,
      progress,
    };
  };

  // Ensure trial countdown updates even if subscription state is stable.
  // Without this, `daysRemaining` can appear "stuck" until some unrelated state change causes a re-render.
  useEffect(() => {
    // Update on foregrounding
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNowMs(Date.now());
    });

    // Also tick periodically (cheap; keeps UI accurate during longer sessions).
    const t = setInterval(() => setNowMs(Date.now()), 60 * 60 * 1000);

    return () => {
      sub.remove();
      clearInterval(t);
    };
  }, []);

  const getBetaAccess = async (): Promise<{ tier: SubscriptionTier; expiresAt: string | null } | null> => {
    try {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('beta_access')
        .select('tier, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !data?.tier) return null;
      const expIso = data.expires_at ? new Date(data.expires_at).toISOString() : null;
      const isExpired = expIso ? new Date(expIso) < new Date() : false;
      if (isExpired) return null;
      return { tier: normalizeTier(data.tier), expiresAt: expIso };
    } catch {
      return null;
    }
  };

  const getDbSubscription = async (): Promise<
    | (SubscriptionMeta & {
        tier: SubscriptionTier;
      })
    | null
  > => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, source, started_at, expires_at, expired_processed_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error || !data?.tier) return null;
      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
      const resolved = isExpired ? 'free' : normalizeTier(data.tier);
      return {
        tier: resolved,
        source: normalizeSource((data as any).source),
        startedAt: (data as any).started_at ? new Date((data as any).started_at).toISOString() : null,
        expiresAt: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        expiredProcessedAt: (data as any).expired_processed_at ? new Date((data as any).expired_processed_at).toISOString() : null,
      };
    } catch {
      return null;
    }
  };

  const applyTierWithOverrides = async (rcTier: SubscriptionTier, rcExpiresAt: string | null) => {
    // Highest priority: beta access allowlist
    const beta = await getBetaAccess();
    if (beta && tierRank(beta.tier) > tierRank(rcTier)) {
      await applyTier({
        nextTier: beta.tier,
        expiresAtIso: beta.expiresAt,
        source: 'beta',
        syncToDb: false,
      });
      return;
    }

    // Fallback: DB tier if higher (useful for reviewer accounts and emergency overrides)
    const db = await getDbSubscription();
    if (db && tierRank(db.tier) > tierRank(rcTier)) {
      // IMPORTANT: do not sync back to DB here. This path often represents server-side trial access
      // (source='trial'), and syncing would incorrectly overwrite `source`.
      await applyTier({
        nextTier: db.tier,
        expiresAtIso: db.expiresAt,
        source: (db.source as any) || null,
        startedAtIso: db.startedAt,
        expiredProcessedAtIso: db.expiredProcessedAt,
        syncToDb: false,
      });
      return;
    }

    await applyTier({
      nextTier: rcTier,
      expiresAtIso: rcExpiresAt,
      source: rcTier === 'free' ? 'free' : 'revenuecat',
      syncToDb: true,
    });
  };

  useEffect(() => {
    if (user) {
      // Defensive: reset to Free on user change until we verify entitlement for THIS user.
      // This avoids stale AsyncStorage upgrades leaking across accounts/builds (common on iOS TestFlight updates).
      setTier('free');
      setIsLoading(true);
      initializeIAP();
      // Prefer RevenueCat if available; fallback to DB/local for dev/web.
      initializeRevenueCat();
    }
    return () => {
      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = null;
    };
  }, [user]);

  const initializeIAP = async () => {
    try {
      // await InAppPurchases.connectAsync();
      
      // Set up purchase listener
      // InAppPurchases.setPurchaseListener((result) => {
      //   if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
      //     result.results?.forEach((purchase) => {
      //       if (!purchase.acknowledged) {
      //         handleSuccessfulPurchase(purchase);
      //       }
      //     });
      //   }
      // });
    } catch (error) {
      console.error('Failed to initialize IAP:', error);
    }
  };

  const normalizeTier = (raw: any): SubscriptionTier => {
    if (!raw) return 'free';
    // Legacy values
    if (raw === 'lite') return 'free';
    if (raw === 'full') return 'pro';
    // Legacy tier still present in some environments; treat as Pro.
    if (raw === 'premium') return 'pro';
    // Current values
    if (raw === 'free' || raw === 'pro') return raw;
    return 'free';
  };

  const normalizeSource = (raw: any): SubscriptionSource => {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return null;
    if (s === 'trial') return 'trial';
    if (s === 'revenuecat') return 'revenuecat';
    if (s === 'beta') return 'beta';
    if (s === 'code' || s === 'access_code' || s === 'redeem' || s === 'redeemed') return 'code';
    if (s === 'free') return 'free';
    return 'unknown';
  };

  const checkSubscriptionStatus = async () => {
    try {
      // NEW: Beta access override should apply even when RevenueCat isn't available.
      // This is critical for waitlist auto-Pro users on TestFlight/dev builds.
      const beta = await getBetaAccess();
      if (beta) {
        await applyTier({
          nextTier: beta.tier,
          expiresAtIso: beta.expiresAt,
          source: 'beta',
          syncToDb: false,
        });
        return;
      }

      // We store tier PER USER (not globally), to avoid cross-account leakage.
      const localTierRaw = await AsyncStorage.getItem(tierStorageKey(user?.id));
      const localTier = normalizeTier(localTierRaw);
      
      // Then verify with backend
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, source, started_at, expires_at, expired_processed_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data && !error) {
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        const resolved = isExpired ? 'free' : normalizeTier(data.tier);
        setTier(resolved);
        await AsyncStorage.setItem(tierStorageKey(user?.id), resolved);
        setSubscription({
          source: normalizeSource((data as any).source),
          startedAt: (data as any).started_at ? new Date((data as any).started_at).toISOString() : null,
          expiresAt: (data as any).expires_at ? new Date((data as any).expires_at).toISOString() : null,
          expiredProcessedAt: (data as any).expired_processed_at ? new Date((data as any).expired_processed_at).toISOString() : null,
        });
      } else {
        // IMPORTANT: if we can't verify entitlement, do NOT "upgrade" from local storage.
        // Default to Free unless the stored value is already Free.
        setTier(localTier === 'free' ? 'free' : 'free');
        setSubscription({ source: null, startedAt: null, expiresAt: null, expiredProcessedAt: null });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTier = async (params: {
    nextTier: SubscriptionTier;
    expiresAtIso: string | null;
    source?: SubscriptionSource;
    startedAtIso?: string | null;
    expiredProcessedAtIso?: string | null;
    syncToDb?: boolean;
  }) => {
    const { nextTier, expiresAtIso, source = null, startedAtIso, expiredProcessedAtIso, syncToDb = true } = params;
    const prev = tier;
    setTier(nextTier);
    await AsyncStorage.setItem(tierStorageKey(user?.id), nextTier);
    setSubscription({
      source,
      startedAt: startedAtIso ?? subscription.startedAt,
      expiresAt: expiresAtIso,
      expiredProcessedAt: expiredProcessedAtIso ?? subscription.expiredProcessedAt,
    });

    // Post-purchase celebration: if the user initiated the launch offer (Premium Annual) and later
    // becomes Pro (via RevenueCat webhook), mark a one-time celebration flag for the UI.
    try {
      if (user?.id && prev !== 'pro' && nextTier === 'pro') {
        const pendingRaw = await AsyncStorage.getItem(launchOfferPendingKey(user.id));
        if (pendingRaw) {
          await AsyncStorage.removeItem(launchOfferPendingKey(user.id));
          const payload = {
            title: 'Upgraded to Pro 🎉',
            badge: 'LAUNCH OFFER',
            message: 'Your launch offer has been applied. You now have Pro features unlocked.',
            ctaLabel: 'Let’s go',
          };
          await AsyncStorage.setItem(celebrationKey(user.id), JSON.stringify(payload));
          // If navigation is ready, show immediately. If not, HomeScreen will pick it up later.
          try {
            rootNavigate('CelebrationModal', payload);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // non-fatal
    }

    // Best-effort sync to backend (RevenueCat remains the source of truth for paid access).
    // We also store a lightweight `source` hint so server-side jobs can distinguish trial vs paid.
    try {
      if (syncToDb && user?.id) {
        const src: string =
          (source as any) ||
          (nextTier === 'free'
            ? 'free'
            : // If we have an expiry from RevenueCat, assume it's store-driven access.
              expiresAtIso
              ? 'revenuecat'
              : 'unknown');
        await supabase.from('user_subscriptions').upsert({
          user_id: user.id,
          tier: nextTier,
          source: src,
          platform: Platform.OS,
          expires_at: expiresAtIso,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // ignore
    }
  };

  const initializeRevenueCat = async () => {
    try {
      const apiKey =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
          : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
            : undefined;

      if (!apiKey || Platform.OS === 'web' || !user?.id) {
        await checkSubscriptionStatus();
        return;
      }

      const ok = await configureRevenueCat({ apiKey, appUserId: user.id });
      if (!ok) {
        await checkSubscriptionStatus();
        return;
      }

      if (unsubscribeRef.current) unsubscribeRef.current();
      unsubscribeRef.current = addCustomerInfoListener(async (info) => {
        const next = resolveTierFromCustomerInfo(info);
        const exp = getExpirationIso(info);
        await applyTierWithOverrides(next, exp);
      });

      const info = await getCustomerInfo();
      if (info) {
        const next = resolveTierFromCustomerInfo(info);
        const exp = getExpirationIso(info);
        await applyTierWithOverrides(next, exp);
      } else {
        await checkSubscriptionStatus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulPurchase = async (purchase: any) => {
    try {
      // Verify purchase with your backend
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user?.id,
          tier: 'pro',
          platform: Platform.OS,
          purchase_token: purchase.purchaseToken || purchase.transactionReceipt,
          purchased_at: new Date().toISOString(),
        });

      if (!error) {
        setTier('pro');
        await AsyncStorage.setItem(tierStorageKey(user?.id), 'pro');
        Alert.alert('Success!', 'You now have Pro access to FLASH!');
      }

      // Acknowledge the purchase
      // await InAppPurchases.finishTransactionAsync(purchase, true);
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process purchase. Please contact support.');
    }
  };

  const purchasePlan = async (plan: Plan, billing: BillingPeriod) => {
    try {
      const apiKey =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
          : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
            : undefined;

      if (!apiKey || Platform.OS === 'web' || !user?.id) {
        Alert.alert('Info', 'Purchases require a store build.');
        return;
      }

      // Purchase from the canonical offering configured in RevenueCat.
      await configureRevenueCat({ apiKey, appUserId: user.id });
      const info = await purchaseFromOffering({ offeringId: 'default', plan, billing });
      const next = resolveTierFromCustomerInfo(info);
      const exp = getExpirationIso(info);
      await applyTier({ nextTier: next, expiresAtIso: exp, source: 'revenuecat', syncToDb: true });

      // Celebration for any successful purchase.
      // We show a one-time modal immediately after purchase completes.
      try {
        const title = next === 'pro' ? 'Welcome to Pro ⚡' : 'Upgraded ✅';
        const badge = next === 'pro' ? 'PRO' : undefined;
        const message = next === 'pro' ? 'Everything is unlocked — Past Papers, AI marking, and more.' : 'Your subscription is now active.';
        const payload = { title, badge, message, ctaLabel: 'Continue' };
        await AsyncStorage.setItem(celebrationKey(user.id), JSON.stringify(payload));
        try {
          rootNavigate('CelebrationModal', payload);
        } catch {
          // ignore
        }
      } catch {
        // non-fatal
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initiate purchase.');
    }
  };

  const restorePurchases = async () => {
    try {
      const info = await rcRestorePurchases();
      if (info) {
        const next = resolveTierFromCustomerInfo(info);
        const exp = getExpirationIso(info);
        await applyTier({ nextTier: next, expiresAtIso: exp, source: 'revenuecat', syncToDb: true });
        Alert.alert('Success', 'Purchases restored.');
      } else {
        Alert.alert('Info', 'Purchase restoration requires a store build.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  const refreshSubscription = async () => {
    try {
      if (!user?.id) return;
      const apiKey =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
          : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
            : undefined;

      if (!apiKey || Platform.OS === 'web') {
        await checkSubscriptionStatus();
        return;
      }

      const ok = await configureRevenueCat({ apiKey, appUserId: user.id });
      if (!ok) {
        await checkSubscriptionStatus();
        return;
      }

      const info = await getCustomerInfo();
      if (info) {
        const next = resolveTierFromCustomerInfo(info);
        const exp = getExpirationIso(info);
        await applyTierWithOverrides(next, exp);
        return;
      }

      await checkSubscriptionStatus();
    } catch {
      // ignore
    }
  };

  const checkLimits = (type: 'subject' | 'topic' | 'card', currentCount: number): boolean => {
    const limits = subscriptionLimits[tier];
    
    switch (type) {
      case 'subject':
        return limits.maxSubjects === -1 || currentCount < limits.maxSubjects;
      case 'topic':
        return limits.maxTopicsPerSubject === -1 || currentCount < limits.maxTopicsPerSubject;
      case 'card':
        return limits.maxCards === -1 || currentCount < limits.maxCards;
      default:
        return false;
    }
  };

  return (
    <SubscriptionContext.Provider 
      value={{ 
        tier, 
        subscription,
        trial: computeTrialInfo(subscription),
        limits: subscriptionLimits[tier], 
        isLoading,
        purchasePlan,
        restorePurchases,
        refreshSubscription,
        checkLimits
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}; 