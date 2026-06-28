import { Tabs } from 'expo-router';
import { Sun, CalendarDays, ClipboardList, DollarSign, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { colors } from '../../../tokens';
import { useBreakpoint } from '../../../lib/useBreakpoint';
import { LiquidGlassTabBar } from '../../../components/LiquidGlassTabBar';
import { tabScreenLayout } from '../../../components/TabScreenTransition';

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

export default function ProviderTabsLayout() {
  const bp = useBreakpoint();
  const hideTabs = Platform.OS === 'web' && bp === 'desktop';
  return (
    <Tabs
      screenOptions={SCREEN_OPTIONS}
      screenLayout={tabScreenLayout}
      tabBar={hideTabs ? () => null : (props) => <LiquidGlassTabBar {...props} />}
    >
      <Tabs.Screen
        name="today"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <Sun size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color }) => <DollarSign size={22} color={color} />,
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
