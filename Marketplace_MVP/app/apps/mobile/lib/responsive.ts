import { Platform } from 'react-native';

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function isWebDesktop(width: number): boolean {
  return Platform.OS === 'web' && width >= BREAKPOINTS.tablet;
}

export function isWebTablet(width: number): boolean {
  return Platform.OS === 'web' && width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
}
