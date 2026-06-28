import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);

  if (status === 'bootstrapping') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/welcome" />;
  if (role === 'homeowner') {
    if (!onboardingComplete) return <Redirect href="/(auth)/address-setup" />;
    return <Redirect href="/(homeowner)/(tabs)/" />;
  }
  if (role === 'provider_owner') {
    // Providers may enter the app before finishing onboarding — the Today tab shows a
    // "continue onboarding" prompt, and they're filtered from marketplace search and
    // receive no jobs until `onboarding_completed_at` is set.
    return <Redirect href="/(provider)/(tabs)/today" />;
  }
  if (role === 'provider_tech') return <Redirect href="/(tech)/(tabs)/today" />;
  return <Redirect href="/(auth)/welcome" />;
}
