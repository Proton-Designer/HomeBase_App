/**
 * Topbar — web-only fixed-top bar rendered above the main content area.
 * 64px tall. Shows logo + page title on the left; an optional right-aligned
 * actions slot.
 *
 * On tablet breakpoint the caller (WebShell) renders a hamburger icon via the
 * `onMenu` prop so users can open the drawer.
 * On desktop the hamburger is omitted (sidebar is always visible).
 * This component renders null on native — Platform guard is in WebShell.
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { colors } from '../../tokens';

export const TOPBAR_HEIGHT = 64;

interface TopbarProps {
  pageTitle?: string;
  onMenu?: () => void;
  rightSlot?: React.ReactNode;
  showMenu?: boolean;
}

function HBLogo({ size = 28 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: colors.primary[600],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.textInverse,
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: size * 0.5,
        }}
      >
        HB
      </Text>
    </View>
  );
}

export function Topbar({ pageTitle, onMenu, rightSlot, showMenu = false }: TopbarProps) {
  const [menuHover, setMenuHover] = useState(false);

  return (
    <View
      style={{
        height: TOPBAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexShrink: 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {showMenu && onMenu ? (
          <Pressable
            onPress={onMenu}
            {...({
              onMouseEnter: () => setMenuHover(true),
              onMouseLeave: () => setMenuHover(false),
            } as object)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            style={[
              {
                padding: 8,
                borderRadius: 8,
                backgroundColor: menuHover ? colors.primary[50] : 'transparent',
              },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
            ]}
          >
            <Menu size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <HBLogo size={28} />
        <Text
          style={{
            fontFamily: 'PlusJakartaSans_700Bold',
            fontSize: 17,
            color: colors.primary[600],
          }}
        >
          HomeBase
        </Text>
        {pageTitle ? (
          <>
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                color: colors.textTertiary,
              }}
            >
              /
            </Text>
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 14,
                color: colors.textSecondary,
              }}
            >
              {pageTitle}
            </Text>
          </>
        ) : null}
      </View>

      {rightSlot ? <View>{rightSlot}</View> : null}
    </View>
  );
}
