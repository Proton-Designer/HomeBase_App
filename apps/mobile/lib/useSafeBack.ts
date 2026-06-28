import { useCallback } from 'react';
import { useRouter, useSegments, type Href } from 'expo-router';

/**
 * Back navigation that never throws "GO_BACK was not handled by any navigator".
 *
 * When there is no screen below the current one — it was reached via
 * `router.replace`, a deep link, or a fast-refresh — `router.back()` emits an
 * unhandled GO_BACK. This guards on `canGoBack()` and otherwise falls back to
 * the role-appropriate home (or an explicit `fallback`).
 */
export function useSafeBack(fallback?: Href) {
  const router = useRouter();
  const segments = useSegments();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (fallback) {
      router.replace(fallback);
      return;
    }
    switch (segments[0]) {
      case '(provider)':
        router.replace('/(provider)/(tabs)/today');
        break;
      case '(tech)':
        router.replace('/(tech)/(tabs)/today');
        break;
      case '(auth)':
        router.replace('/(auth)/welcome');
        break;
      default:
        router.replace('/(homeowner)/(tabs)');
    }
  }, [router, segments, fallback]);
}
