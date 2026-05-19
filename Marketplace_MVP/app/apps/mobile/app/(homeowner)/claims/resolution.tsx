import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useClaimStore } from '../../../stores/claimStore';
import { colors, textStyles } from '../../../tokens';
import { usePress } from '../../../lib/motion';
import type { ResolutionKind } from '../../../lib/types';

interface ResolutionOption {
  kind: ResolutionKind;
  label: string;
  description: string;
  requiresAmount: boolean;
}

const RESOLUTION_OPTIONS: ResolutionOption[] = [
  {
    kind: 'refund',
    label: 'Full refund',
    description: 'I want a complete refund for this job',
    requiresAmount: true,
  },
  {
    kind: 'redo',
    label: 'Redo the job',
    description: 'I want the provider to come back and fix the issue',
    requiresAmount: false,
  },
  {
    kind: 'partial_credit',
    label: 'Partial credit',
    description: 'I want a partial refund or service credit',
    requiresAmount: true,
  },
  {
    kind: 'none',
    label: 'Just want to flag it',
    description: "I'm not seeking a remedy — I want HomeBase to know",
    requiresAmount: false,
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ResolutionCard({
  option,
  selected,
  onPress,
}: {
  option: ResolutionOption;
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
          backgroundColor: selected ? colors.primary[50] : colors.surface,
          borderRadius: 14,
          borderWidth: 2,
          borderColor: selected ? colors.primary[600] : colors.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
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
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: selected ? colors.primary[600] : colors.border,
          backgroundColor: selected ? colors.primary[600] : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Check size={14} color={colors.textInverse} strokeWidth={3} /> : null}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...textStyles['title-md'],
            color: selected ? colors.primary[700] : colors.textPrimary,
          }}
        >
          {option.label}
        </Text>
        <Text
          style={{
            ...textStyles['body-sm'],
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {option.description}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

export default function ClaimResolutionStep() {
  const router = useRouter();
  const requestedResolution = useClaimStore((s) => s.draft.requestedResolution);
  const requestedAmountCents = useClaimStore((s) => s.draft.requestedAmountCents);
  const setResolution = useClaimStore((s) => s.setResolution);
  const setAmountCents = useClaimStore((s) => s.setAmountCents);

  const selectedOption = RESOLUTION_OPTIONS.find((o) => o.kind === requestedResolution) ?? null;
  const needsAmount = selectedOption?.requiresAmount ?? false;

  const amountDollars =
    requestedAmountCents !== null ? (requestedAmountCents / 100).toFixed(2) : '';

  const onAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    if (cleaned === '' || isNaN(parsed)) {
      setAmountCents(null);
    } else {
      setAmountCents(Math.round(parsed * 100));
    }
  };

  const canContinue =
    requestedResolution !== null &&
    (!needsAmount || (requestedAmountCents !== null && requestedAmountCents > 0));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Step 4 of 5</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            What outcome do you want?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            This helps us facilitate the right resolution. You can update your preference once
            our team reviews the claim.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          {RESOLUTION_OPTIONS.map((opt) => (
            <ResolutionCard
              key={opt.kind}
              option={opt}
              selected={requestedResolution === opt.kind}
              onPress={() => {
                setResolution(opt.kind);
                if (!opt.requiresAmount) setAmountCents(null);
              }}
            />
          ))}
        </View>

        {needsAmount ? (
          <View style={{ gap: 8 }}>
            <Input
              label={
                requestedResolution === 'refund'
                  ? 'Refund amount (USD)'
                  : 'Requested credit amount (USD)'
              }
              placeholder="0.00"
              value={amountDollars}
              onChangeText={onAmountChange}
              keyboardType="decimal-pad"
              helperText={
                requestedAmountCents !== null && requestedAmountCents > 0
                  ? `$${(requestedAmountCents / 100).toFixed(2)} requested`
                  : 'Enter the dollar amount you are requesting'
              }
              errorMessage={
                needsAmount && requestedAmountCents !== null && requestedAmountCents <= 0
                  ? 'Please enter an amount greater than $0'
                  : undefined
              }
            />
            <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
              The provider's payout will remain in escrow until this claim is resolved.
            </Text>
          </View>
        ) : null}
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
          disabled={!canContinue}
          onPress={() => router.push('/(homeowner)/claims/review')}
        />
      </View>
    </View>
  );
}
