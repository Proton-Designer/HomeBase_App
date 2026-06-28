import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../lib/navigation';

export default function ProvidersLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}
