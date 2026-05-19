import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ShieldX,
  Frown,
  Clock,
  HeartPulse,
  MoreHorizontal,
} from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../../../components/ui/Button';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useClaimStore } from '../../../stores/claimStore';
import { colors, textStyles } from '../../../tokens';
import { enter, usePress } from '../../../lib/motion';
import type { IncidentType } from '../../../lib/types';

interface IncidentOption {
  type: IncidentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const INCIDENT_OPTIONS: IncidentOption[] = [
  {
    type: 'property_damage',
    label: 'Property damage',
    description: 'Broken fixtures, cracked surfaces, or structural harm',
    icon: <AlertTriangle size={28} color={colors.error} />,
  },
  {
    type: 'theft',
    label: 'Theft',
    description: 'Missing items or valuables taken during the job',
    icon: <ShieldX size={28} color={colors.error} />,
  },
  {
    type: 'poor_quality',
    label: 'Poor quality',
    description: 'Work did not meet the agreed standard',
    icon: <Frown size={28} color={colors.warning} />,
  },
  {
    type: 'no_show',
    label: 'No-show',
    description: 'Provider did not arrive or cancelled without notice',
    icon: <Clock size={28} color={colors.warning} />,
  },
  {
    type: 'injury',
    label: 'Injury',
    description: 'Someone was hurt on your property during the job',
    icon: <HeartPulse size={28} color={colors.error} />,
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Something else went wrong',
    icon: <MoreHorizontal size={28} color={colors.textSecondary} />,
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function IncidentCard({
  option,
  selected,
  onPress,
}: {
  option: IncidentOption;
  selected: boolean;
  onPress: () => void;
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePress();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={Platform.OS === 'web' ? undefined : onPressIn}
      onPressOut={Platform.OS === 'web' ? undefined : onPressOut}
      style={[
        {
          flex: 1,
          minWidth: '45%',
          backgroundColor: selected ? colors.primary[50] : colors.surface,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: selected ? colors.primary[600] : colors.border,
          padding: 16,
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
        Platform.OS !== 'web' ? animatedStyle : null,
      ]}
    >
      <View>{option.icon}</View>
      <Text
        style={{
          ...textStyles['title-md'],
          color: selected ? colors.primary[700] : colors.textPrimary,
        }}
      >
        {option.label}
      </Text>
      <Text style={{ ...textStyles['body-sm'], color: colors.textSecondary }}>
        {option.description}
      </Text>
    </AnimatedPressable>
  );
}

export default function ClaimIncidentStep() {
  const router = useRouter();
  const { jobId, providerId } = useLocalSearchParams<{ jobId?: string; providerId?: string }>();

  const incidentType = useClaimStore((s) => s.draft.incidentType);
  const setIncidentType = useClaimStore((s) => s.setIncidentType);
  const setJobContext = useClaimStore((s) => s.setJobContext);

  useEffect(() => {
    if (jobId && providerId) {
      setJobContext({ jobId, providerId });
    }
  }, [jobId, providerId, setJobContext]);

  const rows: [IncidentOption, IncidentOption][] = [];
  for (let i = 0; i < INCIDENT_OPTIONS.length; i += 2) {
    rows.push([INCIDENT_OPTIONS[i], INCIDENT_OPTIONS[i + 1]] as [IncidentOption, IncidentOption]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={enter}>
          <Eyebrow>Step 1 of 5</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            What went wrong?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Select the type of issue you experienced. This helps the HomeBase team route your claim
            correctly.
          </Text>
        </Animated.View>

        <View style={{ gap: 12 }}>
          {rows.map((pair, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', gap: 12 }}>
              {pair.map((opt) => (
                <IncidentCard
                  key={opt.type}
                  option={opt}
                  selected={incidentType === opt.type}
                  onPress={() => setIncidentType(opt.type)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          label="Continue"
          size="lg"
          fullWidth
          disabled={incidentType === null}
          onPress={() => router.push('/(homeowner)/claims/description')}
        />
      </View>
    </View>
  );
}
