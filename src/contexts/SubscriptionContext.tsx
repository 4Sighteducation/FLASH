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

  const TEST_EMAILS = new Set([
    'appletester@fl4sh.cards',
    'stu1@fl4sh.cards',
    'stu2@fl4sh.cards',
    'stu3@fl4sh.cards',
  ]);

  const isTesterAccount = () => {
    const email = (user?.email || '').toLowerCase();
    return TEST_EMAILS.has(email);
  };

  const tierRank = (t: SubscriptionTier) => (t === 'pro' ? 2 : t === 'premium' ? 1 : 0);

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

  const applyTierWithTesterOverride = async (rcTier: SubscriptionTier, rcExpiresAt: string | null) => {
    if (!isTesterAccount()) {
      await applyTier(rcTier, rcExpiresAt);
      return;
    }

    const db = await getDbTier();
    if (db && tierRank(db.tier) > tierRank(rcTier)) {
      await applyTier(db.tier, db.expiresAt);
      return;
    }
    await applyTier(rcTier, rcExpiresAt);
  };

  useEffect(() => {
    if (user) {
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
      // IMPORTANT: Do not trust local storage as a source of truth for paid access.
      // If RevenueCat is unavailable (web/dev) or DB has no row, default to free.
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, expires_at')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) {
        setTier('free');
        await AsyncStorage.setItem('subscriptionTier', 'free');
        return;
      }

      if (!data?.tier) {
        setTier('free');
        await AsyncStorage.setItem('subscriptionTier', 'free');
        return;
      }

      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
      const resolved = isExpired ? 'free' : normalizeTier(data.tier);
      setTier(resolved);
      await AsyncStorage.setItem('subscriptionTier', resolved);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTier = async (next: SubscriptionTier, expiresAtIso: string | null) => {
    setTier(next);
    await AsyncStorage.setItem('subscriptionTier', next);

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
        await applyTierWithTesterOverride(next, exp);
      });

      const info = await getCustomerInfo();
      if (info) {
        const next = resolveTierFromCustomerInfo(info);
        const exp = getExpirationIso(info);
        await applyTierWithTesterOverride(next, exp);
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
        await AsyncStorage.setItem('subscriptionTier', 'pro');
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
      const info = await purchaseFromOffering({ offeringId: 'default', plan, billing });
      const next = resolveTierFromCustomerInfo(info);
      const exp = getExpirationIso(info);
      await applyTier(next, exp);
    } catch (error) {
      console.error('Purchase error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to initiate purchase.';
      // Surface common RevenueCat config issue with a clearer hint.
      if (typeof msg === 'string' && (msg.includes('offerings') || msg.includes('products') || msg.includes('Offering'))) {
        Alert.alert(
          'Purchase unavailable',
          'RevenueCat could not fetch products from App Store Connect. Please verify RevenueCat Product Catalog IDs match App Store Connect and Offering `default` contains the packages (premium_monthly, premium_annual, pro_monthly, pro_annual).'
        );
        return;
      }
      Alert.alert('Error', msg);
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