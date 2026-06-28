import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Crosshair } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { Slider } from '../../../components/ui/Slider';
import { ServiceAreaMap } from '../../../components/maps/ServiceAreaMap';
import { colors, textStyles, numericTabular } from '../../../tokens';
import { useProviderOnboardingStore } from '../../../stores/providerOnboardingStore';
import { useAuthStore } from '../../../stores/authStore';
import { onboard, saveServiceArea } from '../../../lib/api/providers';

const RADII = [5, 10, 15, 20, 25];

interface Coords {
  lat: number;
  lng: number;
}

export default function ServiceAreaStep() {
  const router = useRouter();
  // Launched from the profile tab as a standalone edit (vs the first-run wizard) — used
  // to return to the profile instead of marching on into banking → the profile step.
  const isEdit = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const serviceArea = useProviderOnboardingStore((s) => s.serviceArea);
  const setServiceArea = useProviderOnboardingStore((s) => s.setServiceArea);
  const business = useProviderOnboardingStore((s) => s.business);
  const setProviderId = useProviderOnboardingStore((s) => s.setProviderId);
  const existingProviderId = useProviderOnboardingStore((s) => s.providerId);
  const authProviderId = useAuthStore((s) => s.providerId);
  const [zip, setZip] = useState(serviceArea.zip);
  const [radius, setRadius] = useState(serviceArea.radiusMiles);
  const [customMode, setCustomMode] = useState(!RADII.includes(serviceArea.radiusMiles));
  const [submitting, setSubmitting] = useState(false);

  const [coords, setCoords] = useState<Coords | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [locating, setLocating] = useState(false);

  // Geocode the zip → map center whenever a full 5-digit zip is present. Forward
  // geocoding via expo-location is keyless (uses the OS geocoder) and needs no permission.
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) {
      setCoords(null);
      setPlace(null);
      setGeoError(false);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    setGeoError(false);
    (async () => {
      try {
        const results = await Location.geocodeAsync(zip);
        if (cancelled) return;
        const hit = results?.[0];
        if (!hit) {
          setCoords(null);
          setPlace(null);
          setGeoError(true);
          return;
        }
        setCoords({ lat: hit.latitude, lng: hit.longitude });
        try {
          const rev = await Location.reverseGeocodeAsync({
            latitude: hit.latitude,
            longitude: hit.longitude,
          });
          if (!cancelled && rev?.[0]) {
            const p = rev[0];
            setPlace([p.city, p.region].filter(Boolean).join(', ') || p.postalCode || zip);
          }
        } catch {
          /* label is best-effort */
        }
      } catch {
        if (!cancelled) {
          setCoords(null);
          setGeoError(true);
        }
      } finally {
        if (!cancelled) setGeocoding(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zip]);

  const useMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Enable location access to drop your service area on your current spot.',
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const rev = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const postal = rev?.[0]?.postalCode?.match(/\d{5}/)?.[0];
      if (postal) {
        setZip(postal);
      } else {
        // Center on the live position even when no zip resolves.
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPlace([rev?.[0]?.city, rev?.[0]?.region].filter(Boolean).join(', ') || 'Your location');
        Alert.alert("Couldn't read your ZIP", 'We centered on your location — type your ZIP to confirm.');
      }
    } catch {
      Alert.alert('Location unavailable', 'Please enter your ZIP manually.');
    } finally {
      setLocating(false);
    }
  };

  const onContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      setServiceArea({ zip: zip.trim(), radiusMiles: radius });
      // This is where the provider row is created/updated from the wizard. onboard() is
      // idempotent (the edge fn updates an existing row or inserts a new one), so in the
      // first-run flow we ALWAYS call it — otherwise a provider re-running onboarding (who
      // already has a row) would have their Step 1/3 business info + services silently
      // dropped. In standalone edit mode we skip it so stale store data can't overwrite the
      // saved business info; we only resave the service area.
      let pid = existingProviderId ?? authProviderId ?? null;
      if (!isEdit) {
        const res = await onboard({
          businessDetails: {
            businessName: business.businessName || 'My Business',
            serviceTypes: business.serviceTypes,
            yearsInBusiness: business.yearsInBusiness,
            employees: business.employees,
            phone: business.phone,
          },
          serviceArea: { radiusMiles: radius },
          availability: {},
        });
        pid = res.providerId;
        setProviderId(pid);
      } else if (!pid) {
        const res = await onboard({
          businessDetails: {
            businessName: business.businessName || 'My Business',
            serviceTypes: business.serviceTypes,
          },
          serviceArea: { radiusMiles: radius },
          availability: {},
        });
        pid = res.providerId;
        setProviderId(pid);
      }
      await saveServiceArea(pid, zip.trim(), radius);
      // Standalone edit: the area is saved — return to the profile instead of pushing
      // on into banking → the blank profile step (which would dead-end / risk a wipe).
      if (isEdit) {
        router.back();
      } else {
        router.push('/(provider)/onboarding/profile');
      }
    } catch (err: unknown) {
      Alert.alert(
        "Couldn't save your setup",
        err instanceof Error ? err.message : 'Please check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={{ ...textStyles['body-md'], color: colors.textSecondary, marginTop: 6 }}>
            You&apos;ll only receive job requests within this area. Adjust anytime.
          </Text>
        </View>

        <Input
          label="Zip Code"
          value={zip}
          onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))}
          keyboardType="number-pad"
          maxLength={5}
          rightIcon={
            <Pressable
              onPress={useMyLocation}
              hitSlop={8}
              disabled={locating}
              accessibilityRole="button"
              accessibilityLabel="Use my current location"
              style={Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : (
                <Crosshair size={18} color={colors.primary[600]} />
              )}
            </Pressable>
          }
        />

        <View style={{ gap: 10 }}>
          <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>Service radius</Text>
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

          <Pressable onPress={() => setCustomMode((v) => !v)} style={{ alignSelf: 'flex-start' }}>
            <Text
              style={{
                ...textStyles['body-sm'],
                fontFamily: 'Inter_600SemiBold',
                color: colors.primary[600],
              }}
            >
              {customMode ? '– Use a preset radius' : '+ Set a custom radius'}
            </Text>
          </Pressable>

          {customMode ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ flex: 1 }}>
                  <Slider min={1} max={50} value={radius} step={1} onChange={setRadius} />
                </View>
                <View style={{ width: 92 }}>
                  <Input
                    value={String(radius)}
                    onChangeText={(v) => {
                      const n = parseInt(v.replace(/\D/g, ''), 10);
                      setRadius(Number.isFinite(n) ? Math.min(50, Math.max(1, n)) : 1);
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>
              <Text style={{ ...textStyles['body-sm'], ...numericTabular, color: colors.textSecondary }}>
                {radius} mile radius
              </Text>
            </View>
          ) : null}
        </View>

        {/* Interactive coverage map — recenters on the geocoded zip, circle scales with radius.
            Degrades to a coverage visualization on web / before the native map module is built. */}
        <Card tone="tinted" tintColor={colors.primary[50]} style={{ padding: 0, overflow: 'hidden' }}>
          <ServiceAreaMap coords={coords} radius={radius} geocoding={geocoding} geoError={geoError} />
          {coords ? (
            <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 2 }}>
              <Text style={{ ...textStyles['title-md'], color: colors.textPrimary }}>
                {place ?? `ZIP ${zip}`}
              </Text>
              <Text
                style={{ ...textStyles['body-sm'], ...numericTabular, color: colors.textSecondary }}
              >
                ~{radius} mi radius · {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
              </Text>
            </View>
          ) : null}
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
          loading={submitting}
          disabled={zip.trim().length < 5}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
