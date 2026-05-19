import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Eyebrow } from '../../../components/ui/Eyebrow';
import { colors, textStyles } from '../../../tokens';
import * as crewApi from '../../../lib/api/crew';
import { useAuthStore } from '../../../stores/authStore';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function InviteTechScreen() {
  const router = useRouter();
  const providerId = useAuthStore((s) => s.providerId);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  async function onSubmit(values: FormValues) {
    if (!providerId) {
      Alert.alert('Error', 'Your provider account is still being set up. Try again shortly.');
      return;
    }
    try {
      await crewApi.invite({
        providerId,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone || undefined,
      });
      Alert.alert(
        'Invite sent',
        `Invite sent to ${values.email}`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch {
      Alert.alert('Error', 'Could not send invite. Please try again.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Stack header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={{ padding: 4 }}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            ...textStyles['title-lg'],
            color: colors.textPrimary,
          }}
        >
          Invite a tech
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 16 }}>
            <Eyebrow>Tech details</Eyebrow>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="First name"
                      placeholder="Devin"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      errorMessage={errors.firstName?.message}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Last name"
                      placeholder="Walker"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      errorMessage={errors.lastName?.message}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="tech@yourcompany.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  errorMessage={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Phone (optional)"
                  placeholder="+1 (972) 555-0100"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  errorMessage={errors.phone?.message}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                />
              )}
            />
          </View>

          <Button
            label="Send invite"
            variant="primary"
            fullWidth
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit)}
          />

          {/* Info card */}
          <Card variant="outlined" style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ marginTop: 2 }}>
              <Info size={16} color={colors.info} />
            </View>
            <Text
              style={{
                flex: 1,
                ...textStyles['body-sm'],
                color: colors.textSecondary,
                lineHeight: 20,
              }}
            >
              Techs only see jobs assigned to them. They can't see schedule, earnings, or banking.
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
