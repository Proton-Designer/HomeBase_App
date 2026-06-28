import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '../tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 22,
            color: colors.textPrimary,
          }}
        >
          We can&apos;t find that screen.
        </Text>
        <Link href="/(auth)/welcome" style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary[600], fontFamily: 'Inter_600SemiBold' }}>
            Back to home
          </Text>
        </Link>
      </View>
    </>
  );
}
