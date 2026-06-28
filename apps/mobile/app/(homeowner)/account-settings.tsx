import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeBack } from '../../lib/useSafeBack';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { invokeFn } from '../../lib/api/functions';
import { Button } from '../../components/ui/Button';
import { colors, fonts, textStyles } from '../../tokens';

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...textStyles.label, color: colors.textSecondary }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontFamily: fonts.body,
          fontSize: 16,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
        }}
      />
    </View>
  );
}

export default function AccountSettingsScreen() {
  const goBack = useSafeBack();
  const { user, profile, refreshProfile, signOut } = useAuthStore();

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!user?.id || saving) return;
    if (!firstName.trim()) {
      Alert.alert('Name required', 'Please enter your first name.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      Alert.alert('Saved', 'Your account details were updated.');
      goBack();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, bookings, and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await invokeFn('delete-account', {});
              await signOut();
            } catch {
              Alert.alert('Could not delete account', 'Please try again or contact support.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[{ padding: 8 }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="Alex" autoCapitalize="words" />
        <Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Reyes" autoCapitalize="words" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" />

        <View style={{ gap: 6 }}>
          <Text style={{ ...textStyles.label, color: colors.textSecondary }}>Email</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: colors.divider,
            }}
          >
            <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.textSecondary }}>
              {user?.email ?? '—'}
            </Text>
          </View>
          <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary }}>
            Contact support to change your email.
          </Text>
        </View>

        <Button label="Save changes" size="lg" fullWidth loading={saving} onPress={onSave} />

        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 8 }} />

        <Pressable
          onPress={onDeleteAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={[{ paddingVertical: 14, alignItems: 'center' }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null]}
        >
          <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: colors.error }}>
            Delete account
          </Text>
        </Pressable>
        <Text style={{ ...textStyles['body-sm'], color: colors.textTertiary, textAlign: 'center' }}>
          Permanently deletes your account and data. This cannot be undone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
