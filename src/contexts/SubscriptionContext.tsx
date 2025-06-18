import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
// import * as InAppPurchases from 'expo-in-app-purchases';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';

type SubscriptionTier = 'lite' | 'full';

interface SubscriptionLimits {
  maxSubjects: number;
  maxTopicsPerSubject: number;
  maxCards: number;
  canUseAI: boolean;
  canExportCards: boolean;
  canUseVoiceAnswers: boolean;
}

interface SubscriptionContextType {
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  isLoading: boolean;
  purchaseFullVersion: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  checkLimits: (type: 'subject' | 'topic' | 'card', currentCount: number) => boolean;
}

const subscriptionLimits: Record<SubscriptionTier, SubscriptionLimits> = {
  lite: {
    maxSubjects: 1,
    maxTopicsPerSubject: 1,
    maxCards: 10,
    canUseAI: false,
    canExportCards: false,
    canUseVoiceAnswers: false,
  },
  full: {
    maxSubjects: -1, // Unlimited
    maxTopicsPerSubject: -1,
    maxCards: -1,
    canUseAI: true,
    canExportCards: true,
    canUseVoiceAnswers: true,
  },
};

// Product IDs for different platforms
const PRODUCT_IDS = {
  ios: 'com.foursighteducation.flash.full',
  android: 'flash_full_version',
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<SubscriptionTier>('lite');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeIAP();
      checkSubscriptionStatus();
    }
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

  const checkSubscriptionStatus = async () => {
    try {
      // Check local storage first
      const localTier = await AsyncStorage.getItem('subscriptionTier');
      
      // Then verify with backend
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('tier, expires_at')
        .eq('user_id', user?.id)
        .single();

      if (data && !error) {
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        setTier(isExpired ? 'lite' : data.tier);
        await AsyncStorage.setItem('subscriptionTier', isExpired ? 'lite' : data.tier);
      } else {
        setTier(localTier as SubscriptionTier || 'lite');
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
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
          tier: 'full',
          platform: Platform.OS,
          purchase_token: purchase.purchaseToken || purchase.transactionReceipt,
          purchased_at: new Date().toISOString(),
        });

      if (!error) {
        setTier('full');
        await AsyncStorage.setItem('subscriptionTier', 'full');
        Alert.alert('Success!', 'You now have full access to FLASH!');
      }

      // Acknowledge the purchase
      // await InAppPurchases.finishTransactionAsync(purchase, true);
    } catch (error) {
      console.error('Error processing purchase:', error);
      Alert.alert('Error', 'Failed to process purchase. Please contact support.');
    }
  };

  const purchaseFullVersion = async () => {
    try {
      // Comment out all IAP functionality since we're using mock
      Alert.alert('Info', 'In-app purchases are not available in this build.');
      /*
      const productId = Platform.OS === 'ios' ? PRODUCT_IDS.ios : PRODUCT_IDS.android;
      
      // Get available products
      const { responseCode, results } = await InAppPurchases.getProductsAsync([productId]);
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results?.length) {
        // Initiate purchase
        await InAppPurchases.purchaseItemAsync(productId);
      } else {
        Alert.alert('Error', 'Product not available. Please try again later.');
      }
      */
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to initiate purchase.');
    }
  };

  const restorePurchases = async () => {
    try {
      // Comment out all IAP functionality since we're using mock
      Alert.alert('Info', 'Purchase restoration is not available in this build.');
      /*
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        const hasFullVersion = results?.some(purchase => 
          purchase.productId === PRODUCT_IDS.ios || 
          purchase.productId === PRODUCT_IDS.android
        );

        if (hasFullVersion) {
          setTier('full');
          await AsyncStorage.setItem('subscriptionTier', 'full');
          Alert.alert('Success', 'Purchases restored successfully!');
        } else {
          Alert.alert('No Purchases', 'No previous purchases found.');
        }
      }
      */
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
        purchaseFullVersion,
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