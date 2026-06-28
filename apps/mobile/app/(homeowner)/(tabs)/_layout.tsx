import { Tabs } from 'expo-router';
import { Home, CalendarPlus, Briefcase, MessageCircle, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { colors } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { LiquidGlassTabBar } from '../../../components/LiquidGlassTabBar';
import { tabScreenLayout } from '../../../components/TabScreenTransition';

// Bar height (64) + bottom margin (12) + average safe-area (~24) = 100 px.
// React Navigation reads `tabBarStyle.height` to inset screen content so it
// scrolls past the floating Liquid Glass bar.
const FLOATING_BAR_HEIGHT = 100;
// No navigator `animation` — it desyncs react-native-screens and white-screens
// tabs. The fade lives in `screenLayout` (TabScreenTransition) instead.
const SCREEN_OPTIONS = {
  headerShown: false as const,
  tabBarShowLabel: true as const,
  tabBarActiveTintColor: colors.primary[600],
  tabBarInactiveTintColor: colors.textTertiary,
  tabBarStyle: {
    height: FLOATING_BAR_HEIGHT,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    position: 'absolute' as const,
    elevation: 0,
  },
};

export default function HomeownerTabsLayout() {
  const bp = useBreakpoint();
  const hideTabs = Platform.OS === 'web' && bp === 'desktop';
  return (
    <Tabs
      screenOptions={SCREEN_OPTIONS}
      screenLayout={tabScreenLayout}
      tabBar={hideTabs ? () => null : (props) => <LiquidGlassTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ color }) => <CalendarPlus size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <Briefcase size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
