import React, { useState } from 'react';
import { Platform, Pressable, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, ChevronRight, CircleCheck, Calendar, Bell, type LucideIcon } from 'lucide-react-native';
import { colors, fonts, numericTabular, shadows, textStyles } from '../../tokens';
import { usePress } from '../../lib/motion';
import { esriSatelliteUrl } from '../../lib/geo';

export interface MyHomeCardProps {
  addressLine: string;
  cityStateZip: string;
  /** Google Street View front-of-house image URL, if resolved by the parent. */
  frontViewUrl?: string | null;
  lat: number | null;
  lng: number | null;
  stats: { completed: number; upcoming: number; reminders: number };
  onPress?: () => void;
  /** Makes the Reminders stat tappable → opens the reminders list. */
  onPressReminders?: () => void;
  style?: ViewStyle;
}

type StatsKey = 'completed' | 'upcoming' | 'reminders';

const STATS_META: { key: StatsKey; label: string; Icon: LucideIcon }[] = [
  { key: 'completed', label: 'Completed', Icon: CircleCheck },
  { key: 'upcoming', label: 'Upcoming', Icon: Calendar },
  { key: 'reminders', label: 'Reminders', Icon: Bell },
];

const THUMB = 68;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MyHomeCard({
  addressLine,
  cityStateZip,
  frontViewUrl,
  lat,
  lng,
  stats,
  onPress,
  onPressReminders,
  style,
}: MyHomeCardProps) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const [frontError, setFrontError] = useState(false);
  const [satError, setSatError] = useState(false);

  // Front-of-house Street View first, then top-down satellite, then a gradient.
  const showFront = !!frontViewUrl && !frontError;
  const showSat = !showFront && lat !== null && lng !== null && !satError;

  const thumb = (
    <View
      style={{
        width: THUMB,
        height: THUMB,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.primary[700],
      }}
    >
      {showFront ? (
        <Image
          source={{ uri: frontViewUrl! }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFrontError(true)}
        />
      ) : showSat ? (
        <Image
          source={{ uri: esriSatelliteUrl({ lat: lat!, lng: lng!, width: 200, height: 200 }) }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setSatError(true)}
        />
      ) : (
        <LinearGradient
          colors={[colors.primary[800], colors.primary[600]]}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Home size={28} color="rgba(255,255,255,0.4)" />
        </LinearGradient>
      )}
    </View>
  );

  const body = (
    <View style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {thumb}
        <View style={{ flex: 1 }}>
          <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }} numberOfLines={1}>
            My Home
          </Text>
          <Text
            style={{ ...textStyles['body-sm'], color: colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
          >
            {addressLine}
          </Text>
          <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }} numberOfLines={1}>
            {cityStateZip}
          </Text>
        </View>
        <ChevronRight size={22} color={colors.textTertiary} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <View style={{ flexDirection: 'row' }}>
        {STATS_META.map(({ key, label, Icon }) => {
          const inner = (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon size={15} color={colors.primary[600]} />
                <Text
                  style={{
                    fontFamily: fonts.editorial,
                    fontSize: 20,
                    lineHeight: 24,
                    color: colors.textPrimary,
                    ...numericTabular,
                  }}
                >
                  {stats[key]}
                </Text>
              </View>
              <Text style={{ ...textStyles['label'], color: colors.textTertiary }}>{label}</Text>
            </>
          );
          if (key === 'reminders' && onPressReminders) {
            return (
              <Pressable
                key={key}
                onPress={onPressReminders}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`${stats.reminders} reminders`}
                style={[
                  { flex: 1, alignItems: 'center', gap: 2 },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
                ]}
              >
                {inner}
              </Pressable>
            );
          }
          return (
            <View key={key} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              {inner}
            </View>
          );
        })}
      </View>
    </View>
  );

  const baseStyle: ViewStyle = {
    borderRadius: 16,
    backgroundColor: colors.surface,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={Platform.OS !== 'web' ? onPressIn : undefined}
        onPressOut={Platform.OS !== 'web' ? onPressOut : undefined}
        style={[
          baseStyle,
          shadows.md,
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          Platform.OS !== 'web' ? animatedStyle : null,
          style,
        ]}
      >
        {body}
      </AnimatedPressable>
    );
  }

  return <View style={[baseStyle, shadows.md, style]}>{body}</View>;
}

export default MyHomeCard;
