/**
 * Liquid Glass Tab Bar
 *
 * Apple introduced "Liquid Glass" as the iOS 26 design language (WWDC25). The
 * tab bar floats above content as a capsule pill with backdrop blur,
 * refractive translucency, and dynamic color tinting from underlying content.
 *
 * Tier strategy (per Apple HIG + Expo docs):
 *  - iOS 26+ → real Liquid Glass via `expo-glass-effect`'s `<GlassView>`
 *  - iOS 17–25 → backdrop blur via `expo-blur`'s `<BlurView>`
 *  - Android → opaque surface + soft shadow (Material 3 conformant)
 *  - Web → CSS `backdrop-filter: blur(20px)` on a translucent surface
 *
 * Renders as a floating capsule pinned 12px from the bottom safe area.
 * Hidden on web at desktop breakpoint via `useBreakpoint()` (the `WebShell`
 * sidebar takes over there).
 *
 * Sources:
 *  - https://developer.apple.com/design/human-interface-guidelines/materials
 *  - https://docs.expo.dev/versions/latest/sdk/glass-effect/
 *  - https://docs.expo.dev/versions/latest/sdk/blur-view/
 *  - https://reactnavigation.org/docs/bottom-tab-navigator/
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useBreakpoint } from '../lib/useBreakpoint';
import { colors } from '../tokens';

const SUPPORTS_LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();
const IS_WEB = Platform.OS === 'web';

const BAR_HEIGHT = 64;
const BAR_RADIUS = 999;
const BAR_HORIZONTAL_MARGIN = 16;
const BAR_BOTTOM_MARGIN = 12;

export function LiquidGlassTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();
  const bp = useBreakpoint();

  // Hidden on web at desktop — the WebShell sidebar handles nav there.
  if (IS_WEB && bp === 'desktop') return null;

  const bottom = Math.max(insets.bottom, BAR_BOTTOM_MARGIN);

  const tabs = state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const label =
      typeof options.tabBarLabel === 'string'
        ? options.tabBarLabel
        : (options.title ?? route.name);

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params as never);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? String(label)}
        onPress={onPress}
        onLongPress={onLongPress}
        style={[styles.tab, IS_WEB ? webPressableStyle : null]}
      >
        {options.tabBarIcon
          ? options.tabBarIcon({
              focused,
              color: focused ? colors.primary[600] : colors.textTertiary,
              size: 22,
            })
          : null}
        {options.tabBarShowLabel === false ? null : (
          <Text
            style={[
              styles.label,
              { color: focused ? colors.primary[600] : colors.textTertiary },
            ]}
            numberOfLines={1}
          >
            {String(label)}
          </Text>
        )}
      </Pressable>
    );
  });

  const containerStyle = [
    styles.container,
    {
      bottom,
      left: BAR_HORIZONTAL_MARGIN,
      right: BAR_HORIZONTAL_MARGIN,
      height: BAR_HEIGHT,
    },
  ];

  if (SUPPORTS_LIQUID_GLASS) {
    return (
      <GlassView
        style={containerStyle}
        glassEffectStyle="regular"
        tintColor="rgba(255, 255, 255, 0.05)"
      >
        <View style={styles.row}>{tabs}</View>
      </GlassView>
    );
  }

  if (Platform.OS === 'ios') {
    // Older iOS — use BlurView for the system blur effect.
    return (
      <BlurView
        intensity={80}
        tint="default"
        style={[containerStyle, styles.barShadow, styles.iosBlurOverlay]}
      >
        <View style={styles.row}>{tabs}</View>
      </BlurView>
    );
  }

  if (IS_WEB) {
    // Web — CSS backdrop-filter via inline style. react-native-web honors
    // `backdropFilter`; most evergreen browsers (Chrome, Safari, Edge, Firefox 103+)
    // handle this natively.
    return (
      <View style={[containerStyle, styles.webBlur, styles.barShadow]}>
        <View style={styles.row}>{tabs}</View>
      </View>
    );
  }

  // Android — opaque surface + shadow. Material 3 doesn't use blur for tab bars.
  return (
    <View style={[containerStyle, styles.androidBar, styles.barShadow]}>
      <View style={styles.row}>{tabs}</View>
    </View>
  );
}

const webPressableStyle = { cursor: 'pointer' as const };

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    lineHeight: 14,
  },
  barShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  // Older iOS — give the BlurView a faint white overlay so it reads as a
  // distinct surface rather than a darkened underlay.
  iosBlurOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  // Web — CSS backdrop-filter blur over a translucent cream.
  // (`backdropFilter`/`WebkitBackdropFilter` are honored by react-native-web
  // even though they aren't part of RN's ViewStyle types — cast as `any`.)
  webBlur: {
    backgroundColor: 'rgba(248, 246, 241, 0.72)',
    backdropFilter: 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: 'blur(22px) saturate(180%)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  } as any,
  androidBar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
