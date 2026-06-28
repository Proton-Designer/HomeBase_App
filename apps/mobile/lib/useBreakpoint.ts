import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
} as const;

function widthToBreakpoint(width: number): Breakpoint {
  if (Platform.OS !== 'web') return 'mobile';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Returns the current breakpoint string, but ONLY triggers a re-render when the
 * breakpoint actually crosses a boundary — not on every 1px window resize.
 *
 * Implementation note: `useWindowDimensions()` (the obvious choice) re-renders
 * subscribers on every pixel of width change. With many screens branching JSX
 * on `isDesktop`, that meant the layout tree could swap mid-resize, re-firing
 * Reanimated entrance animations and causing the visible "modules glitching
 * in and out." We listen via `Dimensions.addEventListener` and gate state
 * updates so the value only changes when the breakpoint string changes.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    widthToBreakpoint(Dimensions.get('window').width)
  );

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      const next = widthToBreakpoint(window.width);
      setBp((prev) => (prev === next ? prev : next));
    });
    return () => sub.remove();
  }, []);

  return bp;
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'desktop';
}

export function useIsTabletOrAbove(): boolean {
  const bp = useBreakpoint();
  return bp === 'tablet' || bp === 'desktop';
}
