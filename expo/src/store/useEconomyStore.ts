import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rtdb as database } from '../lib/firebase';
import { ref, get as fbGet, set as fbSet, update as fbUpdate } from 'firebase/database';
import { showToast } from '../components/ToastOverlay';

/**
 * useEconomyStore — matches iOS AppViewModel+Economy
 * Star wallet, daily rewards, game unlock status, premium subscription.
 */

type GameUnlockStatus = 'free' | 'subscriberUnlocked' | 'trialUsed';

interface EconomyState {
  starsBalance: number;
  isPremium: boolean;
  isLifetime: boolean;
  isProcessingWalletAction: boolean;
  lastDailyClaimDate: string | null;

  // Actions
  refreshBalance: (userId: string) => Promise<void>;
  claimDailyReward: (userId: string) => Promise<void>;
  unlockStatus: (gameId: string, isPremiumGame: boolean) => GameUnlockStatus;
  grantStars: (userId: string, amount: number, reason: string) => Promise<void>;
  spendStars: (userId: string, amount: number, reason: string) => Promise<boolean>;
  setPremium: (premium: boolean, lifetime?: boolean) => void;
}

export const useEconomyStore = create<EconomyState>()(
  persist(
    (set, get) => ({
      starsBalance: 0,
      isPremium: false,
      isLifetime: false,
      isProcessingWalletAction: false,
      lastDailyClaimDate: null,

      refreshBalance: async (userId: string) => {
        try {
          const walletRef = ref(database, `users/${userId}/wallet`);
          const snapshot = await fbGet(walletRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            set({ starsBalance: data.balance || 0 });
          }
        } catch (e) {
          console.warn('Economy: Failed to refresh balance', e);
        }
      },

      claimDailyReward: async (userId: string) => {
        const state = get();
        if (state.isProcessingWalletAction) return;

        const today = new Date().toISOString().split('T')[0];
        if (state.lastDailyClaimDate === today) {
          showToast.info('Already Claimed — Come back tomorrow for more Stars.');
          return;
        }

        set({ isProcessingWalletAction: true });
        try {
          const amount = 5;
          const walletRef = ref(database, `users/${userId}/wallet`);
          const snapshot = await fbGet(walletRef);
          const currentBalance = snapshot.exists() ? snapshot.val().balance || 0 : 0;

          await fbSet(walletRef, {
            balance: currentBalance + amount,
            lastDailyClaim: today,
            updatedAt: Date.now(),
          });

          set({
            starsBalance: currentBalance + amount,
            lastDailyClaimDate: today,
            isProcessingWalletAction: false,
          });

          showToast.success(`+${amount} Stars — Daily reward claimed.`);
        } catch (e: any) {
          set({ isProcessingWalletAction: false });
          showToast.error(`Couldn't claim: ${e.message}`);
        }
      },

      unlockStatus: (gameId: string, isPremiumGame: boolean): GameUnlockStatus => {
        if (!isPremiumGame) return 'free';
        if (get().isPremium) return 'subscriberUnlocked';
        return 'trialUsed';
      },

      grantStars: async (userId: string, amount: number, reason: string) => {
        if (amount <= 0) return;
        try {
          const walletRef = ref(database, `users/${userId}/wallet`);
          const snapshot = await fbGet(walletRef);
          const currentBalance = snapshot.exists() ? snapshot.val().balance || 0 : 0;
          await fbUpdate(walletRef, {
            balance: currentBalance + amount,
            updatedAt: Date.now(),
          });
          set({ starsBalance: currentBalance + amount });
          showToast.success(`+${amount} Stars — ${reason}`);
        } catch (e: any) {
          showToast.error(e.message);
        }
      },

      spendStars: async (userId: string, amount: number, reason: string): Promise<boolean> => {
        const currentBalance = get().starsBalance;
        if (currentBalance < amount) {
          showToast.warning('Not enough Stars.');
          return false;
        }
        try {
          const walletRef = ref(database, `users/${userId}/wallet`);
          await fbUpdate(walletRef, {
            balance: currentBalance - amount,
            updatedAt: Date.now(),
          });
          set({ starsBalance: currentBalance - amount });
          return true;
        } catch (e: any) {
          showToast.error(e.message);
          return false;
        }
      },

      setPremium: (premium: boolean, lifetime: boolean = false) => {
        set({ isPremium: premium, isLifetime: lifetime });
      },
    }),
    {
      name: 'economy-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        starsBalance: state.starsBalance,
        isPremium: state.isPremium,
        isLifetime: state.isLifetime,
        lastDailyClaimDate: state.lastDailyClaimDate,
      }),
    }
  )
);
