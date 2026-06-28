import { Stack } from 'expo-router';
import { STACK_SCREEN_OPTIONS } from '../../../lib/navigation';

export default function PostingsLayout() {
  return <Stack screenOptions={STACK_SCREEN_OPTIONS} />;
}
