import { colors } from '../tokens';

/**
 * Shared transition config for the main homeowner/provider/tech apps.
 *
 * Stacks default to a consistent right-to-left drill-in (`slide_from_right`) on
 * both platforms instead of relying on per-platform defaults, so pushing into a
 * provider profile, job, or settings screen feels the same everywhere. Wizard
 * flows (booking, claims, post-job, onboarding) keep their own custom step
 * transitions and intentionally do NOT use this.
 */
export const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right',
  gestureEnabled: true,
} as const;
