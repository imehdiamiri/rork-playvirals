import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import 'react-native-reanimated';
import {
  useFonts,
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useEconomyStore } from '@/src/store/useEconomyStore';
import { usePaywallStore } from '@/src/store/usePaywallStore';
import { useAudioPreload } from '@/src/hooks/useAudioPreload';
import { ToastOverlay } from '@/src/components/ToastOverlay';
import { RootErrorBoundary } from '@/src/components/ErrorBoundary';
import { setUserOnline, setUserOffline } from '@/src/lib/firebase';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, currentUser, isInitialized, signInAnonymously } = useAuthStore();
  const { hasCompletedOnboarding } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const [isMounted, setIsMounted] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Load unified rounded display font; aliased to legacy 'Viral-*' names so all
  // existing screens render the same chunky rounded face on iOS and Android.
  const [fontsLoaded] = useFonts({
    'Viral-Black': Fredoka_700Bold,
    'Viral-Bold': Fredoka_600SemiBold,
    'Viral-Regular': Fredoka_500Medium,
    'Fredoka_400Regular': Fredoka_400Regular,
    'Fredoka_500Medium': Fredoka_500Medium,
    'Fredoka_600SemiBold': Fredoka_600SemiBold,
    'Fredoka_700Bold': Fredoka_700Bold,
  });

  // Preload sound effects
  useAudioPreload();

  useEffect(() => {
    setIsMounted(true);
    initialize();
  }, [initialize]);

  // Bridge Firebase auth → economy listener + RevenueCat configure.
  // Both stores key off the current uid; detach when signing out.
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      useEconomyStore.getState().detach();
      return;
    }
    useEconomyStore.getState().attach(uid);
    usePaywallStore.getState().configure(uid);
  }, [currentUser?.uid]);

  // Track app foreground/background for presence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const uid = currentUser?.uid;
      if (!uid) return;

      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        setUserOnline(uid);
      } else if (nextState.match(/inactive|background/)) {
        setUserOffline(uid);
      }
      appState.current = nextState;
    });
    return () => subscription.remove();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!isMounted || !navigationState?.key || !isInitialized) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding && !inOnboarding) {
        router.replace('/onboarding');
        return;
      }

      if (hasCompletedOnboarding) {
        // Auto-create an anonymous session so the user can start playing offline
        // immediately. The /auth screen is only shown when the user explicitly
        // navigates there (e.g. to upgrade their account from profile/paywall
        // or for online features that require a real account).
        if (!currentUser) {
          signInAnonymously().catch(() => {});
        }

        if (currentUser && inOnboarding) {
          router.replace('/(tabs)');
        }
        // Note: we no longer auto-redirect into /auth. Users on /auth stay there
        // until they sign in/up or close the screen themselves.
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [currentUser, isInitialized, segments, navigationState?.key, hasCompletedOnboarding, isMounted]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: 'black' }} />;
  }

  return (
    <RootErrorBoundary>
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tools)" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="purchase-detail" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="team-setup" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <ToastOverlay />
    </ThemeProvider>
    </RootErrorBoundary>
  );
}
