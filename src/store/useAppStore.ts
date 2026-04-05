/**
 * Zustand store for transient UI state and auth.
 * Auth state is PERSISTED to AsyncStorage so the user stays logged in.
 * Data state (transactions, categories) lives in WatermelonDB.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  userId: string | null;
  phoneNumber: string | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  currencySymbol: string;
}

interface UIState {
  isAddSheetOpen: boolean;
  selectedTab: 'home' | 'transactions' | 'insights' | 'settings';
  isLoading: boolean;
  activeAccountId: string | undefined;
}

interface AppState extends AuthState, UIState {
  // Auth actions
  setAuth: (userId: string, phoneNumber: string) => void;
  setOnboarded: (value: boolean) => void;
  clearAuth: () => void;

  // UI actions
  setAddSheetOpen: (open: boolean) => void;
  setSelectedTab: (tab: UIState['selectedTab']) => void;
  setLoading: (loading: boolean) => void;
  setCurrencySymbol: (symbol: string) => void;
  setActiveAccountId: (accountId: string | undefined) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      // Initial auth state
      userId: null,
      phoneNumber: null,
      isAuthenticated: false,
      isOnboarded: false,
      currencySymbol: '₹',

      // Initial UI state
      isAddSheetOpen: false,
      selectedTab: 'home',
      isLoading: false,
      activeAccountId: undefined,

      // Auth actions
      setAuth: (userId, phoneNumber) =>
        set({userId, phoneNumber, isAuthenticated: true}),

      setOnboarded: value => set({isOnboarded: value}),

      clearAuth: () =>
        set({
          userId: null,
          phoneNumber: null,
          isAuthenticated: false,
          isOnboarded: false,
        }),

      // UI actions
      setAddSheetOpen: open => set({isAddSheetOpen: open}),
      setSelectedTab: tab => set({selectedTab: tab}),
      setLoading: loading => set({isLoading: loading}),
      setCurrencySymbol: symbol => set({currencySymbol: symbol}),
      setActiveAccountId: accountId => set({activeAccountId: accountId}),
    }),
    {
      name: 'finpace-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist auth fields, not UI state
      partialize: state => ({
        userId: state.userId,
        phoneNumber: state.phoneNumber,
        isAuthenticated: state.isAuthenticated,
        isOnboarded: state.isOnboarded,
        currencySymbol: state.currencySymbol,
      }),
    },
  ),
);
