import React, { useState } from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Animated from 'react-native-reanimated';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AddressAutocomplete } from '../../components/auth/AddressAutocomplete';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { useAuthStore } from '../../stores/authStore';
import { useBreakpoint } from '../../lib/useBreakpoint';
import { enter } from '../../lib/motion';
import { colors, textStyles } from '../../tokens';

const schema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().regex(/^[A-Z]{2}$/, 'Enter a 2-letter state code (e.g. TX)'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
  neighborhood: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AddressSetupScreen() {
  const router = useRouter();
  const setPendingHomeownerSetup = useAuthStore((s) => s.setPendingHomeownerSetup);
  const bp = useBreakpoint();
  const isWebSplit = Platform.OS === 'web' && bp !== 'mobile';

  const { control, handleSubmit, setValue, trigger, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { street: '', city: '', state: '', zip: '', neighborhood: '' },
    mode: 'onChange',
  });
  // Coordinates from a real address selection — required so every home can be mapped.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const onContinue = (values: FormValues) => {
    setPendingHomeownerSetup({
      street: values.street,
      city: values.city,
      state: values.state,
      zip: values.zip,
      neighborhood: values.neighborhood?.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    });
    router.push('/(auth)/service-interest');
  };

  return (
    <AuthScreenShell keyboardAvoiding showBack={false}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          { paddingBottom: 48, width: '100%' },
          isWebSplit
            ? { paddingHorizontal: 40, maxWidth: 420 }
            : { paddingHorizontal: 24, maxWidth: 520, alignSelf: 'center' },
        ]}
      >
        <Animated.View entering={enter} style={{ gap: 8, marginTop: isWebSplit ? 0 : 8 }}>
          <Text style={{ ...textStyles['editorial-title'], color: colors.textPrimary }}>
            Where is your home?
          </Text>
          <Text style={{ ...textStyles['body-lg'], color: colors.textSecondary }}>
            Search and select your address so we can map your home and match pros on your block.
          </Text>
        </Animated.View>

        <Animated.View entering={enter} style={{ marginTop: 24, gap: 16 }}>
          <AddressAutocomplete
            onSelect={(s) => {
              setValue('street', s.street, { shouldValidate: true });
              if (s.city) setValue('city', s.city, { shouldValidate: true });
              if (s.state) setValue('state', s.state, { shouldValidate: true });
              if (s.zip) setValue('zip', s.zip, { shouldValidate: true });
              setCoords({ lat: s.lat, lng: s.lng });
              void trigger();
            }}
          />
          <Controller
            control={control}
            name="street"
            render={({ field, fieldState }) => (
              <Input
                label="Street address"
                placeholder="123 Main St"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field, fieldState }) => (
              <Input
                label="City"
                placeholder="City"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                errorMessage={fieldState.error?.message}
              />
            )}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="state"
                render={({ field, fieldState }) => (
                  <Input
                    label="State"
                    placeholder="TX"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    autoCapitalize="characters"
                    maxLength={2}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="zip"
                render={({ field, fieldState }) => (
                  <Input
                    label="ZIP code"
                    placeholder="78704"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="number-pad"
                    maxLength={10}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="neighborhood"
            render={({ field, fieldState }) => (
              <Input
                label="Neighborhood (optional)"
                placeholder="e.g. Stonebridge Ranch"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="words"
                errorMessage={fieldState.error?.message}
              />
            )}
          />
        </Animated.View>

        <Animated.View entering={enter} style={{ marginTop: 32 }}>
          <Button
            label="Continue"
            size="lg"
            fullWidth
            disabled={!formState.isValid}
            onPress={handleSubmit(onContinue)}
          />
        </Animated.View>
      </ScrollView>
    </AuthScreenShell>
  );
}
