import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../tokens';

export default function ProviderLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'bootstrapping') return null;
  if (status === 'unauthenticated') return <Redirect href="/(auth)/welcome" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
