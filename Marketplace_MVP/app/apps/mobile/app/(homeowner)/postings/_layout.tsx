import { Stack } from 'expo-router';
import { colors } from '../../../tokens';

export default function PostingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
