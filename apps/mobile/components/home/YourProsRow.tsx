import React from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { ShieldCheck } from 'lucide-react-native';
import { colors, fonts, textStyles, shadows, numericTabular } from '../../tokens';
import { enterStaggered, usePress } from '../../lib/motion';
import { serviceLabel } from '../../lib/home/serviceMeta';
import type { ProviderSummary } from '../../lib/home/yourPros';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function trustColor(score: number | null): string {
  if (score === null) return colors.textSecondary;
  if (score >= 4.5) return colors.success;
  if (score >= 3.5) return colors.accent[600];
  return colors.textSecondary;
}

export interface YourProsRowProps {
  pros: ProviderSummary[];
  onRehire: (pro: ProviderSummary) => void;
  onOpen: (providerId: string) => void;
}

export function YourProsRow({ pros, onRehire, onOpen }: YourProsRowProps) {
  if (pros.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingBottom: 4, paddingRight: 4 }}
    >
      {pros.map((pro, i) => (
        <ProCard
          key={pro.providerId}
          pro={pro}
          index={i}
          onRehire={onRehire}
          onOpen={onOpen}
        />
      ))}
    </ScrollView>
  );
}

function ProCard({
  pro,
  index,
  onRehire,
  onOpen,
}: {
  pro: ProviderSummary;
  index: number;
  onRehire: (pro: ProviderSummary) => void;
  onOpen: (providerId: string) => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();
  const scoreColor = trustColor(pro.scoreOverall);
  const initials = pro.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <Animated.View
      entering={enterStaggered(index)}
      style={[
        {
          width: 168,
          backgroundColor: colors.surface,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadows.sm,
      ]}
    >
      <AnimatedPressable
        onPress={() => onOpen(pro.providerId)}
        onPressIn={Platform.OS !== 'web' ? onPressIn : undefined}
        onPressOut={Platform.OS !== 'web' ? onPressOut : undefined}
        accessibilityRole="button"
        accessibilityLabel={`View ${pro.name}'s profile`}
        style={[
          { padding: 12 },
          Platform.OS !== 'web' ? animatedStyle : null,
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        ]}
      >
        {pro.avatarUrl ? (
          <Image
            source={{ uri: pro.avatarUrl }}
            style={{ width: 44, height: 44, borderRadius: 22 }}
          />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary[100],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                ...textStyles['title-md'],
                color: colors.primary[700],
              }}
            >
              {initials}
            </Text>
          </View>
        )}

        <Text
          style={{
            ...textStyles['title-md'],
            color: colors.textPrimary,
            marginTop: 8,
          }}
          numberOfLines={1}
        >
          {pro.name}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 6,
          }}
        >
          <ShieldCheck size={13} color={scoreColor} />
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 15,
              lineHeight: 19,
              color: scoreColor,
              ...numericTabular,
            }}
          >
            {pro.scoreOverall != null ? pro.scoreOverall.toFixed(1) : '—'}
          </Text>
          <Text
            style={{
              ...textStyles['label'],
              color: colors.textTertiary,
              marginLeft: 2,
            }}
          >
            trust
          </Text>
        </View>

        <Text
          style={{
            ...textStyles['body-sm'],
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {serviceLabel(pro.lastServiceType)}
        </Text>
      </AnimatedPressable>

      <RebookButton pro={pro} onRehire={onRehire} />
    </Animated.View>
  );
}

function RebookButton({
  pro,
  onRehire,
}: {
  pro: ProviderSummary;
  onRehire: (pro: ProviderSummary) => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();

  return (
    <Animated.View
      style={[
        { marginHorizontal: 12, marginBottom: 12, marginTop: 10 },
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <Pressable
        onPress={() => onRehire(pro)}
        onPressIn={Platform.OS !== 'web' ? onPressIn : undefined}
        onPressOut={Platform.OS !== 'web' ? onPressOut : undefined}
        accessibilityRole="button"
        accessibilityLabel={`Rebook ${pro.name}`}
        style={[
          {
            backgroundColor: colors.primary[600],
            borderRadius: 999,
            paddingVertical: 8,
            alignItems: 'center',
            justifyContent: 'center',
          },
          Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        ]}
      >
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: 13,
            lineHeight: 18,
            color: colors.textInverse,
          }}
        >
          Rebook
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default YourProsRow;
