import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

export type SubscriptionTier = 'free' | 'premium' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';
export type Plan = 'pro';

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

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // MOCK: Default to Pro for development
  const [tier] = useState<SubscriptionTier>('pro');
  const [isLoading] = useState(false);

  const purchasePlan = async () => {
    console.log('MOCK: Purchase plan - requires custom build');
    Alert.alert('Development Mode', 'Purchases require a store build. Running in development mode with Pro access.');
  };

  const restorePurchases = async () => {
    console.log('MOCK: Restore purchases - requires custom build');
    Alert.alert('Development Mode', 'Purchases require a store build. Running in development mode with Pro access.');
  };

  const checkLimits = (type: 'subject' | 'topic' | 'card', currentCount: number): boolean => {
    // MOCK: Always return true (no limits in development)
    return true;
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