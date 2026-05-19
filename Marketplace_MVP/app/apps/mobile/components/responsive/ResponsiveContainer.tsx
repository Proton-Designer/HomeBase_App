import React from 'react';
import { Platform, View, type ViewStyle } from 'react-native';
import { useBreakpoint } from '../../lib/useBreakpoint';

const CONTENT_MAX_WIDTH = 1200;

interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

/**
 * On web ≥768px: centres content, applies max-width cap, and adds symmetric
 * horizontal padding (24px tablet, 48px desktop).
 * On native and web <768px: passthrough — renders children directly in a
 * flex:1 View to avoid breaking existing native layouts.
 */
export function ResponsiveContainer({
  children,
  maxWidth = CONTENT_MAX_WIDTH,
  style,
}: ResponsiveContainerProps) {
  const bp = useBreakpoint();

  if (Platform.OS !== 'web' || bp === 'mobile') {
    return <View style={[{ flex: 1 }, style]}>{children}</View>;
  }

  const paddingH = bp === 'desktop' ? 48 : 24;

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View
        style={[
          {
            width: '100%',
            maxWidth,
            paddingHorizontal: paddingH,
            flex: 1,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
