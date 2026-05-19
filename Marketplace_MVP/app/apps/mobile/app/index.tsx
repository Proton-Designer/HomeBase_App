import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);

  if (status === 'bootstrapping') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/welcome" />;
  if (role === 'homeowner') return <Redirect href="/(homeowner)/(tabs)/" />;
  if (role === 'provider_owner') {
    return onboardingComplete ? (
      <Redirect href="/(provider)/(tabs)/today" />
    ) : (
      <Redirect href="/(provider)/onboarding/welcome" />
    );
  }
  if (role === 'provider_tech') return <Redirect href="/(tech)/(tabs)/today" />;
  return <Redirect href="/(auth)/welcome" />;
}
