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
// New pricing model: Pro-only (we keep backward-compat by mapping Premium entitlement -> Pro access).
export type Plan = 'pro';

export type RevenueCatTier = 'free' | 'premium' | 'pro';

export type OfferingPackagePricing = {
  identifier: string;
  plan: Plan;
  billing: BillingPeriod;
  priceString: string;
  price: number | null;
  currencyCode: string | null;
  // Common RevenueCat shape: { unit: 'MONTH'|'YEAR'|..., value: number }
  subscriptionPeriod?: { unit?: string; value?: number } | null;
};

export function resolveTierFromCustomerInfo(info: any): RevenueCatTier {
  const active = info?.entitlements?.active ?? {};
  // Transition safety: treat any legacy Premium entitlement as Pro access.
  if (active.pro || active.premium) return 'pro';
  return 'free';
}

export function getExpirationIso(info: any): string | null {
  const active = info?.entitlements?.active ?? {};
  const ent = active.pro ?? active.premium;
  const exp = ent?.expirationDate || ent?.expiresDate || ent?.expires_at;
  return exp ? new Date(exp).toISOString() : null;
}

export async function configureRevenueCat(params: { apiKey: string; appUserId?: string }): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;

  try {
    // Configure once per app launch. Prefer setting appUserID at configure-time.
    // NOTE: For showing prices on the paywall, we may configure without an appUserID (anonymous user),
    // so Apple review can see prices even before account creation/sign-in.
    if (params.appUserId) {
      await Purchases.configure({ apiKey: params.apiKey, appUserID: params.appUserId });
    } else {
      await Purchases.configure({ apiKey: params.apiKey });
    }
    return true;
  } catch (e) {
    console.warn('[RevenueCat] configure failed', e);
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

export async function getOfferingPackagePricing(offeringId: string): Promise<Record<string, OfferingPackagePricing>> {
  const Purchases = getPurchases();
  if (!Purchases) return {};

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings?.all?.[offeringId] ?? offerings?.current;
    const available = offering?.availablePackages ?? [];

    const out: Record<string, OfferingPackagePricing> = {};

    for (const p of available) {
      const identifier = p?.identifier as string | undefined;
      if (!identifier) continue;

      const [planRaw, billingRaw] = identifier.split('_');
      const plan = (planRaw === 'pro' ? planRaw : null) as Plan | null;
      const billing = (billingRaw === 'monthly' || billingRaw === 'annual' ? billingRaw : null) as BillingPeriod | null;
      if (!plan || !billing) continue;

      const product = p?.product ?? {};

      out[identifier] = {
        identifier,
        plan,
        billing,
        priceString: product?.priceString ?? '',
        price: typeof product?.price === 'number' ? product.price : null,
        currencyCode: typeof product?.currencyCode === 'string' ? product.currencyCode : null,
        subscriptionPeriod: product?.subscriptionPeriod ?? null,
      };
    }

    return out;
  } catch {
    return {};
  }
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



