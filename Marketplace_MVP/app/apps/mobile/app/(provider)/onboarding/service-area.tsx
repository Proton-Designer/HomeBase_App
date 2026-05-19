import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Crosshair } from 'lucide-react-native';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import type { TextStyle } from 'react-native';
import { colors, textStyles, numericTabular } from '../../../tokens';

const RADII = [5, 10, 15, 20, 25];

export default function ServiceAreaStep() {
  const router = useRouter();
  const [zip, setZip] = useState('');
  const [radius, setRadius] = useState(15);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View>
          <Text
            style={{
              ...textStyles['editorial-title'],
              fontSize: 28,
              lineHeight: 34,
              color: colors.textPrimary,
            }}
          >
            Where do you serve?
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            You'll only receive job requests within this area. Adjust anytime.
          </Text>
        </View>

        <Input
          label="Home zip code"
          value={zip}
          onChangeText={setZip}
          keyboardType="numeric"
          rightIcon={
            <Pressable hitSlop={6}>
              <Crosshair size={18} color={colors.primary[600]} />
            </Pressable>
          }
        />

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
            Service radius
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {RADII.map((r) => {
              const sel = r === radius;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRadius(r)}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    alignItems: 'center',
                    borderRadius: 14,
                    backgroundColor: sel ? colors.primary[600] : colors.surface,
                    borderWidth: 1.5,
                    borderColor: sel ? colors.primary[600] : colors.border,
                  }}
                >
                  <Text
                    style={{
                      ...textStyles['display-md'],
                      ...numericTabular,
                      fontSize: 18,
                      lineHeight: 22,
                      color: sel ? colors.textInverse : colors.textPrimary,
                    }}
                  >
                    {r}
                  </Text>
                  <Text
                    style={{
                      ...textStyles['body-sm'],
                      fontSize: 11,
                      color: sel ? colors.textInverse : colors.textSecondary,
                      opacity: 0.85,
                      marginTop: 2,
                    }}
                  >
                    miles
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card
          tone="tinted"
          tintColor={colors.primary[50]}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 36,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={26} color={colors.textInverse} />
          </View>
          <Text
            style={{
              ...textStyles['title-md'],
              color: colors.textPrimary,
              marginTop: 12,
            }}
          >
            Map preview
          </Text>
          <Text
            style={{
              ...textStyles['body-sm'],
              ...numericTabular,
              color: colors.textSecondary,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Coverage circle around {zip} · ~{radius} miles
          </Text>
        </Card>
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
          fullWidth
          onPress={() => router.push('/(provider)/onboarding/availability')}
        />
      </View>
    </View>
  );
}
