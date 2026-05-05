import { create } from 'zustand';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

interface PaywallState {
  isLoading: boolean;
  isPurchasing: boolean;
  isPremium: boolean;
  error: string | null;
  packages: PurchasesPackage[];
  stars: number;
  
  initialize: () => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
  
  getSubscriptionPackages: () => PurchasesPackage[];
  getLifetimePackage: () => PurchasesPackage | undefined;
  getStarPackages: () => PurchasesPackage[];
  getDonationPackages: () => PurchasesPackage[];
}

// RevenueCat API keys from environment
const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';
const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';

export const usePaywallStore = create<PaywallState>((set, get) => ({
  isLoading: true,
  isPurchasing: false,
  isPremium: false,
  error: null,
  packages: [],
  stars: 0, // Mocked star count

  initialize: async () => {
    try {
      if (Platform.OS === 'ios') {
        Purchases.configure({ apiKey: API_KEY_IOS });
      } else if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: API_KEY_ANDROID });
      }
      
      const customerInfo = await Purchases.getCustomerInfo();
      // Check if the user has an active entitlement
      const isPremium = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
      
      set({ isPremium });
      await get().fetchOfferings();
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  fetchOfferings: async () => {
    set({ isLoading: true, error: null });
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current !== null) {
        set({ packages: offerings.current.availablePackages, isLoading: false });
      } else {
        set({ packages: [], isLoading: false });
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  purchasePackage: async (pkg: PurchasesPackage) => {
    set({ isPurchasing: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
      set({ isPremium, isPurchasing: false });
      return true;
    } catch (e: any) {
      if (!e.userCancelled) {
        set({ error: e.message });
      }
      set({ isPurchasing: false });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = typeof customerInfo.entitlements.active['Premium'] !== 'undefined';
      set({ isPremium, isLoading: false });
      return true;
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // Helpers to filter packages (similar to Swift logic)
  getSubscriptionPackages: () => {
    return get().packages.filter(p => p.packageType === 'ANNUAL' || p.packageType === 'MONTHLY' || p.packageType === 'WEEKLY');
  },
  
  getLifetimePackage: () => {
    return get().packages.find(p => p.packageType === 'LIFETIME');
  },
  
  getStarPackages: () => {
    // Modify based on your actual product identifiers for stars
    return get().packages.filter(p => p.packageType === 'CUSTOM' && p.identifier.includes('star'));
  },
  
  getDonationPackages: () => {
    // Modify based on your actual product identifiers for donations
    return get().packages.filter(p => p.packageType === 'CUSTOM' && p.identifier.includes('donation'));
  }
}));
