import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, textStyles } from '../../tokens';

export interface CoverageProps {
  coords: { lat: number; lng: number } | null;
  radius: number;
  geocoding: boolean;
  geoError: boolean;
}

/**
 * Keyless coverage preview used on web and as the native fallback when the
 * `react-native-maps` native module isn't available (e.g. before a dev-client
 * rebuild). A scaled ring around a centered pin — recenters as the geocoded zip
 * changes, ring grows with the radius.
 */
export function CoverageVisualization({ coords, radius, geocoding, geoError }: CoverageProps) {
  const ringSize = 70 + ((radius - 5) / 20) * 110;
  return (
    <View
      style={{
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary[50],
      }}
    >
      {geocoding ? (
        <ActivityIndicator color={colors.primary[600]} />
      ) : coords ? (
        <>
          <View
            style={{
              position: 'absolute',
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              backgroundColor: 'rgba(37, 99, 235, 0.10)',
              borderWidth: 1.5,
              borderColor: colors.primary[300],
            }}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primary[600],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapPin size={22} color={colors.textInverse} />
          </View>
        </>
      ) : (
        <View style={{ alignItems: 'center', gap: 8, paddingHorizontal: 24 }}>
          <MapPin size={26} color={colors.textTertiary} />
          <Text
            style={{
              ...textStyles['body-sm'],
              color: geoError ? colors.error : colors.textSecondary,
              textAlign: 'center',
            }}
          >
            {geoError
              ? "We couldn't locate that ZIP — double-check it."
              : 'Enter your ZIP to preview your coverage area.'}
          </Text>
        </View>
      )}
    </View>
  );
}
