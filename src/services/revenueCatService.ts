import { Platform } from 'react-native';

type PurchasesModule = any;

let cachedPurchases: PurchasesModule | undefined;

function getPurchases(): PurchasesModule | null {
  if (Platform.OS === 'web') return null;
  if (cachedPurchases !== undefined) return cachedPurchases;
  try {
    // Lazy require so web builds / Expo Go don't hard-crash.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    cachedPurchases = mod?.default ?? mod;
    return cachedPurchases;
  } catch {
    cachedPurchases = null;
    return null;
  }
}

export type BillingPeriod = 'monthly' | 'annual';
export type Plan = 'premium' | 'pro';

export type RevenueCatTier = 'free' | 'premium' | 'pro';

export function resolveTierFromCustomerInfo(info: any): RevenueCatTier {
  const active = info?.entitlements?.active ?? {};
  if (active.pro) return 'pro';
  if (active.premium) return 'premium';
  return 'free';
}

export function getExpirationIso(info: any): string | null {
  const active = info?.entitlements?.active ?? {};
  const ent = active.pro ?? active.premium;
  const exp = ent?.expirationDate || ent?.expiresDate || ent?.expires_at;
  return exp ? new Date(exp).toISOString() : null;
}

export async function configureRevenueCat(params: { apiKey: string; appUserId: string }): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;

  try {
    // Configure once per app launch. If called repeatedly, Purchases will no-op.
    await Purchases.configure({ apiKey: params.apiKey });
    if (params.appUserId) {
      // Tie RevenueCat identity to Supabase user id (stable across devices).
      if (typeof Purchases.logIn === 'function') {
        await Purchases.logIn(params.appUserId);
      } else if (typeof Purchases.setAttributes === 'function') {
        await Purchases.setAttributes({ app_user_id: params.appUserId });
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function getCustomerInfo(): Promise<any | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export async function restorePurchases(): Promise<any | null> {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export async function purchaseFromOffering(params: {
  offeringId: string;
  plan: Plan;
  billing: BillingPeriod;
}): Promise<any> {
  const Purchases = getPurchases();
  if (!Purchases) {
    throw new Error('Purchases SDK unavailable (requires a store build).');
  }

  const pkgId = `${params.plan}_${params.billing}`;
  const offerings = await Purchases.getOfferings();
  const offering = offerings?.all?.[params.offeringId] ?? offerings?.current;
  const available = offering?.availablePackages ?? [];
  const pkg = available.find((p: any) => p.identifier === pkgId);
  if (!pkg) {
    throw new Error(`Package not found in offering: ${pkgId}`);
  }

  const res = await Purchases.purchasePackage(pkg);
  return res?.customerInfo ?? res;
}

export function addCustomerInfoListener(cb: (info: any) => void): (() => void) | null {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  if (typeof Purchases.addCustomerInfoUpdateListener !== 'function') return null;

  Purchases.addCustomerInfoUpdateListener(cb);

  // Some versions expose a remove method; if not, return a no-op.
  return () => {
    if (typeof Purchases.removeCustomerInfoUpdateListener === 'function') {
      Purchases.removeCustomerInfoUpdateListener(cb);
    }
  };
}


