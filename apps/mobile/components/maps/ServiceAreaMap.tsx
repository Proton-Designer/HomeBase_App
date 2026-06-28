import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { colors } from '../../tokens';
import { CoverageVisualization, type CoverageProps } from './CoverageVisualization';

const MILES_TO_METERS = 1609.34;
const DEG_PER_MILE = 1 / 69;

/**
 * Catches the native-view error thrown when `react-native-maps` is in package.json
 * but the native module isn't linked yet (after `expo install`, before a rebuild),
 * so the screen degrades to the coverage visualization instead of red-screening.
 */
class MapErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Native interactive map (Apple Maps on iOS, Google Maps on Android). */
export function ServiceAreaMap(props: CoverageProps) {
  const { coords, radius } = props;
  const mapRef = useRef<MapView>(null);
  const latDelta = Math.max(0.05, radius * 2.5 * DEG_PER_MILE);

  // Recenter / re-zoom when the geocoded zip or the radius changes. Uncontrolled
  // region (initialRegion + imperative animate) keeps pan/zoom gestures free.
  useEffect(() => {
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: latDelta,
          longitudeDelta: latDelta,
        },
        500,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng, radius]);

  if (!coords) return <CoverageVisualization {...props} />;

  return (
    <MapErrorBoundary fallback={<CoverageVisualization {...props} />}>
      <View style={{ height: 220 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: latDelta,
            longitudeDelta: latDelta,
          }}
        >
          <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} />
          <Circle
            center={{ latitude: coords.lat, longitude: coords.lng }}
            radius={radius * MILES_TO_METERS}
            strokeColor={colors.primary[600]}
            fillColor="rgba(37, 99, 235, 0.12)"
            strokeWidth={2}
          />
        </MapView>
      </View>
    </MapErrorBoundary>
  );
}
