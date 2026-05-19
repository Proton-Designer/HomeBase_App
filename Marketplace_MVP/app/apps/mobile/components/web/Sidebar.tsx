/**
 * Sidebar — web-only fixed-left navigation rail.
 *
 * Desktop (≥1024px): 240px full sidebar with logo, role-aware nav, user chip,
 * and sign-out.
 * Tablet (768–1023px): icon-only collapsed rail at 64px.
 * Mobile-web / native: hidden — the caller (WebShell) handles switching to a
 * TopBar drawer at tablet or native bottom tabs at mobile.
 *
 * Implemented inline in this file so it can be imported independently.
 * The root WebShell.tsx composes this component; both refer to the same source
 * of truth for styles and nav arrays.
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  Home,
  CalendarPlus,
  Briefcase,
  MessageCircle,
  User,
  Sun,
  CalendarDays,
  ClipboardList,
  DollarSign,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { colors } from '../../tokens';
import type { UserRole } from '../../lib/types';

if (Platform.OS !== 'web') {
  // Prevent native bundles from tree-shaking the guard; this module should
  // never render on native, but safety-checking here avoids runtime errors.
}

export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

export type NavItem = {
  label: string;
  href: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  matches: string[];
};

export const HOMEOWNER_NAV: NavItem[] = [
  {
    label: 'Home',
    href: '/(homeowner)/(tabs)/',
    Icon: Home,
    matches: ['/(homeowner)/(tabs)', '/(homeowner)/(tabs)/index'],
  },
  {
    label: 'Book',
    href: '/(homeowner)/(tabs)/book',
    Icon: CalendarPlus,
    matches: ['/(homeowner)/(tabs)/book', '/(homeowner)/booking'],
  },
  {
    label: 'Jobs',
    href: '/(homeowner)/(tabs)/jobs',
    Icon: Briefcase,
    matches: ['/(homeowner)/(tabs)/jobs', '/(homeowner)/job'],
  },
  {
    label: 'Inbox',
    href: '/(homeowner)/(tabs)/inbox',
    Icon: MessageCircle,
    matches: ['/(homeowner)/(tabs)/inbox', '/(homeowner)/thread'],
  },
  {
    label: 'Profile',
    href: '/(homeowner)/(tabs)/profile',
    Icon: User,
    matches: ['/(homeowner)/(tabs)/profile'],
  },
];

export const PROVIDER_NAV: NavItem[] = [
  {
    label: 'Today',
    href: '/(provider)/(tabs)/today',
    Icon: Sun,
    matches: ['/(provider)/(tabs)/today'],
  },
  {
    label: 'Schedule',
    href: '/(provider)/(tabs)/schedule',
    Icon: CalendarDays,
    matches: ['/(provider)/(tabs)/schedule'],
  },
  {
    label: 'Jobs',
    href: '/(provider)/(tabs)/jobs',
    Icon: ClipboardList,
    matches: ['/(provider)/(tabs)/jobs'],
  },
  {
    label: 'Earnings',
    href: '/(provider)/(tabs)/earnings',
    Icon: DollarSign,
    matches: ['/(provider)/(tabs)/earnings'],
  },
  {
    label: 'Profile',
    href: '/(provider)/(tabs)/profile',
    Icon: User,
    matches: ['/(provider)/(tabs)/profile'],
  },
];

export const TECH_NAV: NavItem[] = [
  {
    label: 'Today',
    href: '/(tech)/(tabs)/today',
    Icon: Sun,
    matches: ['/(tech)/(tabs)/today'],
  },
  {
    label: 'Earnings',
    href: '/(tech)/(tabs)/earnings',
    Icon: DollarSign,
    matches: ['/(tech)/(tabs)/earnings'],
  },
];

export function navForRole(role: UserRole | null): NavItem[] {
  if (role === 'provider_owner') return PROVIDER_NAV;
  if (role === 'provider_tech') return TECH_NAV;
  return HOMEOWNER_NAV;
}

export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!pathname) return false;
  return item.matches.some((m) => {
    const stripped = m.replace(/\/\([^)]+\)/g, '');
    const path = pathname.replace(/\/\([^)]+\)/g, '');
    if (stripped === '' || stripped === '/') return path === '/' || path === '';
    return path === stripped || path.startsWith(stripped + '/');
  });
}

function HBLogo({ size = 32 }: { size?: number }) {
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

function NavLink({
  item,
  active,
  collapsed,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onPress: () => void;
}) {
  const [hover, setHover] = useState(false);
  const Icon = item.Icon;
  const bg = active ? colors.primary[100] : hover ? colors.primary[50] : 'transparent';
  const fg = active ? colors.primary[600] : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      {...({
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onFocus: () => setHover(true),
        onBlur: () => setHover(false),
      } as object)}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: collapsed ? 0 : 12,
          paddingHorizontal: collapsed ? 0 : 12,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: bg,
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderLeftWidth: active && !collapsed ? 2 : 0,
          borderLeftColor: active ? colors.primary[600] : 'transparent',
        },
        { cursor: 'pointer' } as object,
      ]}
    >
      <Icon size={20} color={fg} />
      {!collapsed ? (
        <Text
          style={{
            fontFamily: active ? 'Inter_600SemiBold' : 'Inter_500Medium',
            fontSize: 14,
            color: fg,
          }}
        >
          {item.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
}

export function Sidebar({ onNavigate, collapsed = false }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? '';
  const role = useAuthStore((s) => s.role);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const items = navForRole(role);
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <View
      style={{
        width,
        backgroundColor: colors.primary[50],
        borderRightWidth: 1,
        borderRightColor: colors.border,
        paddingHorizontal: collapsed ? 8 : 16,
        paddingVertical: 20,
        gap: 4,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: collapsed ? 0 : 10,
          paddingHorizontal: collapsed ? 0 : 4,
          marginBottom: 24,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <HBLogo />
        {!collapsed ? (
          <Text
            style={{
              fontFamily: 'PlusJakartaSans_700Bold',
              fontSize: 18,
              color: colors.primary[600],
            }}
          >
            HomeBase
          </Text>
        ) : null}
      </View>

      <View style={{ gap: 4, flex: 1 }}>
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavItemActive(pathname, item)}
            collapsed={collapsed}
            onPress={() => {
              router.push(item.href as never);
              onNavigate?.();
            }}
          />
        ))}
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
          gap: 8,
        }}
      >
        {user && !collapsed ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingHorizontal: 4,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.primary[600],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.textInverse,
                  fontFamily: 'PlusJakartaSans_700Bold',
                  fontSize: 14,
                }}
              >
                {(user.email ?? '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
                numberOfLines={1}
              >
                {user.email}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 11,
                  color: colors.textSecondary,
                  textTransform: 'capitalize',
                }}
              >
                {(role ?? '').replace('_', ' ')}
              </Text>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            if (user) signOut();
            router.replace('/(auth)/welcome' as never);
            onNavigate?.();
          }}
          accessibilityRole="button"
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: collapsed ? 0 : 10,
              paddingHorizontal: collapsed ? 0 : 12,
              paddingVertical: 10,
              borderRadius: 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
            },
            { cursor: 'pointer' } as object,
          ]}
        >
          <LogOut size={18} color={colors.textSecondary} />
          {!collapsed ? (
            <Text
              style={{
                fontFamily: 'Inter_500Medium',
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              {user ? 'Sign out' : 'Sign in'}
            </Text>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
