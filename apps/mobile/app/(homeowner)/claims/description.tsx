import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Info } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { useClaimStore } from '../../../stores/claimStore';
import { colors, textStyles } from '../../../tokens';

const MIN_LEN = 30;
const MAX_LEN = 1000;

export default function ClaimDescriptionStep() {
  const router = useRouter();
  const description = useClaimStore((s) => s.draft.description);
  const setDescription = useClaimStore((s) => s.setDescription);

  const len = description.trim().length;
  const canContinue = len >= MIN_LEN;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Step 2 of 5</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Describe what happened
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Be as specific as possible. A detailed description helps us resolve your claim faster.
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            backgroundColor: colors.infoLight,
            borderRadius: 12,
            padding: 14,
            alignItems: 'flex-start',
          }}
        >
          <Info size={16} color={colors.info} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                ...textStyles['title-md'],
                color: colors.info,
              }}
            >
              What to include
            </Text>
            {[
              'What happened and when',
              'What was damaged, missing, or done poorly',
              'Names of any witnesses',
              'Any conversation with the provider about the issue',
            ].map((tip) => (
              <Text
                key={tip}
                style={{ ...textStyles['body-sm'], color: colors.info }}
              >
                · {tip}
              </Text>
            ))}
          </View>
        </View>

        <Input
          label="Description"
          placeholder="Describe the issue in detail…"
          value={description}
          onChangeText={(t) => t.length <= MAX_LEN && setDescription(t)}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          inputStyle={{ minHeight: 160 }}
          helperText={`${description.length}/${MAX_LEN} · ${
            len < MIN_LEN ? `at least ${MIN_LEN} characters` : 'looks good'
          }`}
          errorMessage={
            description.length > 0 && len < MIN_LEN
              ? `Please add at least ${MIN_LEN - len} more characters`
              : undefined
          }
        />
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
          onPress={() => router.push('/(homeowner)/claims/photos')}
        />
      </View>
    </View>
  );
}
