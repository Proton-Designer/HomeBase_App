import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { usePostingStore } from '../../../stores/postingStore';
import { colors, textStyles } from '../../../tokens';

const MAX_LEN = 90;
const MIN_LEN = 8;

export default function PostJobHeadlineStep() {
  const router = useRouter();
  const headline = usePostingStore((s) => s.draft.headline);
  const setHeadline = usePostingStore((s) => s.setHeadline);

  const canContinue = headline.trim().length >= MIN_LEN;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Title your post</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            One line summary
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Keep it short and concrete. Pros will see this in their feed before reading details.
          </Text>
        </View>

        <Input
          label="Headline"
          placeholder="e.g. Trim two oaks before storm season"
          value={headline}
          onChangeText={(t) => (t.length <= MAX_LEN ? setHeadline(t) : null)}
          helperText={`${headline.length}/${MAX_LEN} · ${
            headline.trim().length < MIN_LEN ? `at least ${MIN_LEN} characters` : 'looks good'
          }`}
        />

        <View style={{ gap: 6 }}>
          <Text style={{ ...textStyles.label, color: colors.textTertiary }}>Examples</Text>
          {[
            'Weekly pool service for 18,000 gallon backyard pool',
            'Move-out deep clean — 3bd / 2ba townhome',
            'Quarterly pest treatment, kid- and pet-safe formulas only',
            'Wash siding and front porch — Hardie + brick',
          ].map((ex) => (
            <Text
              key={ex}
              style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
            >
              · {ex}
            </Text>
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
          disabled={!canContinue}
          onPress={() => router.push('/(homeowner)/post-job/description')}
        />
      </View>
    </View>
  );
}
