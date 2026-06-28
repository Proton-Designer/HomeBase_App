import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { STACK_SCREEN_OPTIONS } from '../../lib/navigation';

export default function TechLayout() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.role);
  if (status === 'bootstrapping') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/welcome" />;
  if (role !== 'provider_tech') return <Redirect href="/" />;
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}
