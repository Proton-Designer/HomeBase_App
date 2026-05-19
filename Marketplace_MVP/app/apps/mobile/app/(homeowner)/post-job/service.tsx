import React from 'react';
import { View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Leaf,
  Sparkles,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
  CloudRain,
  Car,
  TreeDeciduous,
  Sun,
  Check,
} from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { usePostingStore } from '../../../stores/postingStore';
import { colors, textStyles, serviceTints } from '../../../tokens';
import type { ServiceType } from '../../../lib/types';

const SERVICES: {
  id: ServiceType;
  title: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: 'lawn', title: 'Lawn Care', Icon: Leaf },
  { id: 'cleaning', title: 'Home Cleaning', Icon: Sparkles },
  { id: 'pool', title: 'Pool Cleaning', Icon: Waves },
  { id: 'pest', title: 'Pest Control', Icon: Bug },
  { id: 'pressure', title: 'Pressure Washing', Icon: Droplets },
  { id: 'window', title: 'Window Cleaning', Icon: SquareDashed },
  { id: 'gutter', title: 'Gutter Cleaning', Icon: CloudRain },
  { id: 'detailing', title: 'Car Detailing', Icon: Car },
  { id: 'tree', title: 'Tree & Plant Trimming', Icon: TreeDeciduous },
  { id: 'solar', title: 'Solar Panel Cleaning', Icon: Sun },
];

export default function PostJobServiceStep() {
  const router = useRouter();
  const draftService = usePostingStore((s) => s.draft.serviceType);
  const setServiceType = usePostingStore((s) => s.setServiceType);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 140, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View>
          <Eyebrow tone="accent">Post a custom job</Eyebrow>
          <Text
            style={{
              ...textStyles['editorial-title'],
              color: colors.textPrimary,
              marginTop: 8,
            }}
          >
            What kind of work?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Pick the closest category. We&apos;ll route your post to vetted local pros.
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          {SERVICES.map((s) => {
            const selected = draftService === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setServiceType(s.id)}
                style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
              >
                <Card
                  tone="tinted"
                  tintColor={selected ? colors.primary[100] : serviceTints[s.id]}
                  style={{
                    borderWidth: 2,
                    borderColor: selected ? colors.primary[600] : 'transparent',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.surface,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <s.Icon size={22} color={colors.primary[600]} />
                    </View>
                    <Text style={{ flex: 1, ...textStyles['title-md'], color: colors.textPrimary }}>
                      {s.title}
                    </Text>
                    {selected ? (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          backgroundColor: colors.primary[600],
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} color={colors.textInverse} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
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
          disabled={!draftService}
          onPress={() => router.push('/(homeowner)/post-job/headline')}
        />
      </View>
    </View>
  );
}
