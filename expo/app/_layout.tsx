import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useAudioPreload } from '@/src/hooks/useAudioPreload';
import { ToastOverlay } from '@/src/components/ToastOverlay';
import { DeviceIdentity } from '@/src/utils/DeviceIdentity';
import { setUserOnline, setUserOffline } from '@/src/lib/firebase';
import { configureLLM } from '@/src/services/LLMService';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { initialize, currentUser, isInitialized } = useAuthStore();
  const { hasCompletedOnboarding } = useSettingsStore();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const [isMounted, setIsMounted] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Preload sound effects
  useAudioPreload();

  useEffect(() => {
    setIsMounted(true);
    initialize();
    DeviceIdentity.init(); // warm device ID cache

    // Configure LLM service with Gemini API key (free tier)
    const geminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (geminiKey) configureLLM(geminiKey);
  }, [initialize]);

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

    // Ensure we route after the root layout has finished mounting
    // On web, allow deep-linking to game, tools, paywall, etc. without requiring auth
    const isProtectedRoute = segments[0] === '(tabs)' || (segments.length as number) === 0;
    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding && !inOnboarding) {
        router.replace('/onboarding');
      } else if (hasCompletedOnboarding) {
        if (!currentUser && !inAuthGroup && isProtectedRoute) {
          router.replace('/auth');
        } else if (currentUser && (inAuthGroup || inOnboarding)) {
          // Only redirect away from auth if user is NOT anonymous (guest).
          // Anonymous users visiting /auth want to upgrade to a real account,
          // so let them stay on the auth screen.
          const isAnonymous = currentUser.isAnonymous;
          if (!isAnonymous) {
            router.replace('/(tabs)');
          }
        }
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [currentUser, isInitialized, segments, navigationState?.key, hasCompletedOnboarding, isMounted]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tools)" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="purchase-detail" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="team-setup" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <ToastOverlay />
    </ThemeProvider>
  );
}
