import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '../lib/queryClient';
import { colors } from '../tokens';
import { WebShell } from '../components/WebShell';
import { FontProvider } from '../components/FontProvider';
import { AppSplashScreen } from '../components/AppSplashScreen';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { useAuthStore } from '../stores/authStore';
import * as notificationsApi from '../lib/api/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

const ROOT_STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
} as const;
const ROOT_GHR_STYLE = { flex: 1, backgroundColor: colors.background } as const;
const ROOT_FILL = { flex: 1 } as const;

/** Minimum time the branded splash stays up so its entrance animation always lands. */
const SPLASH_MIN_DURATION_MS = 1200;

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const [minDurationElapsed, setMinDurationElapsed] = useState(false);
  const [splashMounted, setSplashMounted] = useState(true);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Hold the splash for a minimum beat so its entrance animation always lands,
  // even when session restore resolves near-instantly.
  useEffect(() => {
    const timer = setTimeout(() => setMinDurationElapsed(true), SPLASH_MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  const bootReady = status !== 'bootstrapping' && minDurationElapsed;

  const handleSplashExit = useCallback(() => setSplashMounted(false), []);

  // Register push token once the user is authenticated. Never blocks app boot.
  useEffect(() => {
    if (status !== 'authenticated' || Platform.OS === 'web') return;

    const registerToken = async () => {
      try {
        // Dynamic import so web bundles don't pull in native-only modules
        const Notifications = await import('expo-notifications');

        const { status: existingStatus } = await Notifications.default.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status: requested } = await Notifications.default.requestPermissionsAsync();
          finalStatus = requested;
        }
        if (finalStatus !== 'granted') return;

        const tokenData = await Notifications.default.getExpoPushTokenAsync();
        await notificationsApi.register(tokenData.data, Platform.OS);
      } catch {
        // Never surface push registration errors to the user — simulators will throw
        // on getExpoPushTokenAsync() which is expected and safe to swallow.
      }
    };

    registerToken();
  }, [status, user?.id]);

  // The splash stays the same mounted instance across the whole boot: it holds
  // alone until `bootReady`, then fades itself out over the app (instead of a
  // hard cut) once `exiting` flips. Keeping one instance avoids a remount that
  // would restart its entrance animation mid-fade.
  return (
    <View style={ROOT_FILL}>
      {bootReady && children}
      {splashMounted && (
        <AppSplashScreen exiting={bootReady} onExitComplete={handleSplashExit} />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <FontProvider>
      <GestureHandlerRootView style={ROOT_GHR_STYLE}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" />
            <AppErrorBoundary>
              <AuthBootstrap>
                <WebShell>
                  <Stack screenOptions={ROOT_STACK_SCREEN_OPTIONS}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(homeowner)" />
                    <Stack.Screen name="(provider)" />
                    <Stack.Screen name="(tech)" />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </WebShell>
              </AuthBootstrap>
            </AppErrorBoundary>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </FontProvider>
  );
}
