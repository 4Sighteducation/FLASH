import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
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
  limits: SubscriptionLimits;
  isLoading: boolean;
  purchasePlan: (plan: Plan, billing: BillingPeriod) => Promise<void>;
  restorePurchases: () => Promise<void>;
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
    canUseVoiceAnswers: false,
    canAccessPapers: false,
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
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const unsubscribeRef = React.useRef<null | (() => void)>(null);

  const tierStorageKey = (userId?: string | null) => `subscriptionTier:${userId || 'anon'}`;
  const launchOfferPendingKey = (userId?: string | null) => `launch_offer_pending_v1:${userId || 'anon'}`;
  const celebrationKey = (userId?: string | null) => `celebration_pending_v1:${userId || 'anon'}`;

  const tierRank = (t: SubscriptionTier) => (t === 'pro' ? 2 : t === 'premium' ? 1 : 0);

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

  const getDbTier = async (): Promise<{ tier: SubscriptionTier; expiresAt: string | null } | null> => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, expires_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error || !data?.tier) return null;
      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
      const resolved = isExpired ? 'free' : normalizeTier(data.tier);
      return { tier: resolved, expiresAt: data.expires_at ? new Date(data.expires_at).toISOString() : null };
    } catch {
      return null;
    }
  };

  const applyTierWithOverrides = async (rcTier: SubscriptionTier, rcExpiresAt: string | null) => {
    // Highest priority: beta access allowlist
    const beta = await getBetaAccess();
    if (beta && tierRank(beta.tier) > tierRank(rcTier)) {
      await applyTier(beta.tier, beta.expiresAt);
      return;
    }

    // Fallback: DB tier if higher (useful for reviewer accounts and emergency overrides)
    const db = await getDbTier();
    if (db && tierRank(db.tier) > tierRank(rcTier)) {
      await applyTier(db.tier, db.expiresAt);
      return;
    }

    await applyTier(rcTier, rcExpiresAt);
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
    // Current values
    if (raw === 'free' || raw === 'premium' || raw === 'pro') return raw;
    return 'free';
  };

  const checkSubscriptionStatus = async () => {
    try {
      // NEW: Beta access override should apply even when RevenueCat isn't available.
      // This is critical for waitlist auto-Pro users on TestFlight/dev builds.
      const beta = await getBetaAccess();
      if (beta) {
        await applyTier(beta.tier, beta.expiresAt);
        return;
      }

      // We store tier PER USER (not globally), to avoid cross-account leakage.
      const localTierRaw = await AsyncStorage.getItem(tierStorageKey(user?.id));
      const localTier = normalizeTier(localTierRaw);
      
      // Then verify with backend
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, expires_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data && !error) {
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        const resolved = isExpired ? 'free' : normalizeTier(data.tier);
        setTier(resolved);
        await AsyncStorage.setItem(tierStorageKey(user?.id), resolved);
      } else {
        // IMPORTANT: if we can't verify entitlement, do NOT "upgrade" from local storage.
        // Default to Free unless the stored value is already Free.
        setTier(localTier === 'free' ? 'free' : 'free');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTier = async (next: SubscriptionTier, expiresAtIso: string | null) => {
    const prev = tier;
    setTier(next);
    await AsyncStorage.setItem(tierStorageKey(user?.id), next);

    // Post-purchase celebration: if the user initiated the launch offer (Premium Annual) and later
    // becomes Pro (via RevenueCat webhook), mark a one-time celebration flag for the UI.
    try {
      if (user?.id && prev !== 'pro' && next === 'pro') {
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

    // Best-effort sync to backend (source of truth will eventually be RevenueCat webhooks).
    // This keeps your existing DB checks working during the transition.
    try {
      if (user?.id) {
        await supabase.from('user_subscriptions').upsert({
          user_id: user.id,
          tier: next,
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
      await applyTier(next, exp);

      // Celebration for any successful purchase (monthly/annual, premium/pro).
      // We show a one-time modal immediately after purchase completes.
      try {
        const title = next === 'pro' ? 'Welcome to Pro ⚡' : next === 'premium' ? 'Premium unlocked ✅' : 'Upgraded ✅';
        const badge = next === 'pro' ? 'PRO' : next === 'premium' ? 'PREMIUM' : undefined;
        const message =
          next === 'pro'
            ? 'Everything is unlocked — Past Papers, AI marking, and more.'
            : next === 'premium'
              ? 'Unlimited study essentials unlocked. You can upgrade to Pro any time.'
              : 'Your subscription is now active.';
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
        await applyTier(next, exp);
        Alert.alert('Success', 'Purchases restored.');
      } else {
        Alert.alert('Info', 'Purchase restoration requires a store build.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases.');
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
        limits: subscriptionLimits[tier], 
        isLoading,
        purchasePlan,
        restorePurchases,
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