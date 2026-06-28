import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, X, MapPin } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useBookingStore } from '../../../stores/bookingStore';
import { enter } from '../../../lib/motion';
import { colors, textStyles } from '../../../tokens';

const MAX_INSTRUCTIONS = 500;

export default function DetailsStep() {
  const router = useRouter();
  const {
    specialInstructions,
    photoUrl,
    addressLabel,
    setInstructions,
    setPhoto,
  } = useBookingStore();
  const [savePref, setSavePref] = useState(true);

  return (
    <View testID="booking-step-details" style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 22 }}>
        <Animated.View entering={enter}>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
            A few job details
          </Text>
          <Text
            style={{
              ...textStyles['body-md'],
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Anything your pro should know before they arrive.
          </Text>
        </Animated.View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary[50],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={20} color={colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...textStyles.label, color: colors.textSecondary }}>
                Service address
              </Text>
              <Text
                style={{
                  ...textStyles['title-md'],
                  color: colors.textPrimary,
                  marginTop: 4,
                }}
              >
                {addressLabel ?? 'No address on file'}
              </Text>
            </View>
            <Pressable
              hitSlop={6}
              accessibilityLabel="Edit service address"
              // TODO: replace with dedicated address-edit route once it exists
              onPress={() => router.push('/(auth)/address-setup' as never)}
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
            >
              <Text
                style={{
                  ...textStyles['body-sm'],
                  fontFamily: 'Inter_600SemiBold',
                  color: colors.primary[600],
                }}
              >
                Edit
              </Text>
            </Pressable>
          </View>
        </Card>

        <View>
          <Input
            testID="booking-details-notes-input"
            label="Special instructions (optional)"
            placeholder="Gate code, dog in backyard, parking notes…"
            multiline
            value={specialInstructions}
            onChangeText={(t) =>
              t.length <= MAX_INSTRUCTIONS ? setInstructions(t) : null
            }
            helperText={`${specialInstructions.length}/${MAX_INSTRUCTIONS}`}
          />
        </View>

        <View>
          <Text
            style={{
              ...textStyles.label,
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            Property photo (optional)
          </Text>
          {photoUrl ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Image
                source={{ uri: photoUrl }}
                style={{ width: 96, height: 96, borderRadius: 12 }}
              />
              <Pressable testID="booking-details-photo-remove" onPress={() => setPhoto(null)} hitSlop={8}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color={colors.textSecondary} />
                </View>
              </Pressable>
            </View>
          ) : (
            <Pressable
              testID="booking-details-photo-capture"
              onPress={() => {
                /* Photo picker wired by booking-and-checkin agent */
              }}
              style={[
                {
                  height: 96,
                  borderRadius: 12,
                  borderStyle: 'dashed',
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  flexDirection: 'row',
                },
                Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
              ]}
            >
              <Camera size={20} color={colors.textSecondary} />
              <Text style={{ ...textStyles['body-sm'], fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>
                Tap to add photo
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          testID="booking-details-save-pref-toggle"
          onPress={() => setSavePref((s) => !s)}
          style={[
            { flexDirection: 'row', alignItems: 'center', gap: 12 },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: savePref ? colors.primary[600] : colors.surface,
              borderWidth: 1.5,
              borderColor: savePref ? colors.primary[600] : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {savePref ? (
              <Text style={{ color: colors.textInverse, fontSize: 13, fontWeight: '700' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ ...textStyles['body-md'], color: colors.textPrimary }}>
            Save these instructions for future bookings
          </Text>
        </Pressable>
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
          testID="booking-details-next"
          label="Continue"
          size="lg"
          fullWidth
          onPress={() => router.push('/(homeowner)/booking/payment')}
        />
      </View>
    </View>
  );
}
