import React from 'react';
import { Image, Text, View } from 'react-native';
import { VerificationBadge } from '../shared/VerificationBadge';
import { colors, textStyles } from '../../tokens';

interface ThreadEmptyPanelProps {
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  serviceType: string | null;
  isProvider: boolean;
  showVerificationBadge?: boolean;
}

function LargeAvatar({ uri, name }: { uri: string | null; name: string }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: 64, height: 64, borderRadius: 32 }}
        accessibilityLabel={`${name}'s avatar`}
      />
    );
  }
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, color: colors.primary[700] }}
      >
        {initial}
      </Text>
    </View>
  );
}

export function ThreadEmptyPanel({
  otherPartyName,
  otherPartyAvatarUrl,
  serviceType,
  isProvider,
  showVerificationBadge = false,
}: ThreadEmptyPanelProps) {
  const description = serviceType
    ? `This is the start of your conversation about ${serviceType}.`
    : 'This is the start of your conversation.';

  return (
    <View
      style={{
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
      }}
    >
      <LargeAvatar uri={otherPartyAvatarUrl} name={otherPartyName} />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginTop: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <Text style={{ ...textStyles['title-lg'], color: colors.textPrimary }}>
          {otherPartyName}
        </Text>
        {isProvider && showVerificationBadge && <VerificationBadge tier={1} size="sm" />}
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: colors.divider,
          alignSelf: 'stretch',
          marginVertical: 20,
        }}
      />

      <Text
        style={{
          ...textStyles['body-md'],
          color: colors.textSecondary,
          textAlign: 'center',
        }}
      >
        {description}
      </Text>
    </View>
  );
}
