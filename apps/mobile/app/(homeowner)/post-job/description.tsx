import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { usePostingStore } from '../../../stores/postingStore';
import { colors, textStyles } from '../../../tokens';

const MAX_LEN = 600;
const MIN_LEN = 30;

export default function PostJobDescriptionStep() {
  const router = useRouter();
  const description = usePostingStore((s) => s.draft.description);
  const setDescription = usePostingStore((s) => s.setDescription);

  const canContinue = description.trim().length >= MIN_LEN;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow>Tell pros what you need</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            Describe the job
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Include scope, timing, anything specific (gate code, pets, access notes). The more
            detail, the better the quotes.
          </Text>
        </View>

        <Input
          placeholder="e.g. Two mature oaks ~30ft, lower limbs scraping the roof. Need a clean trim plus dead-branch removal before the next storm. ISA-certified arborist preferred. Yard waste hauled off."
          multiline
          value={description}
          onChangeText={(t) => (t.length <= MAX_LEN ? setDescription(t) : null)}
          helperText={`${description.length}/${MAX_LEN} · ${
            description.trim().length < MIN_LEN ? `at least ${MIN_LEN} characters` : 'looks good'
          }`}
        />

        <View style={{ gap: 6 }}>
          <Text style={{ ...textStyles.label, color: colors.textTertiary }}>
            Helpful to mention
          </Text>
          {[
            'Property size or square footage',
            'Recurrence preference (one-off, weekly, monthly)',
            'Photos of the area you want serviced',
            'Date / time window that works for you',
            'Special needs (pets, gates, eco products, etc.)',
          ].map((tip) => (
            <Text
              key={tip}
              style={{ ...textStyles['body-sm'], color: colors.textSecondary }}
            >
              · {tip}
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
          onPress={() => router.push('/(homeowner)/post-job/photos')}
        />
      </View>
    </View>
  );
}
