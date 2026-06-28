const ESRI_EXPORT =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';

const METERS_PER_LAT_DEG = 111320;

/**
 * Builds an Esri World Imagery satellite image URL centered on a coordinate —
 * keyless, works identically on web, iOS, and Android as a plain <Image> source.
 *
 * The bbox is computed so the ground span matches the image aspect ratio,
 * avoiding horizontal/vertical stretching of the imagery.
 */
export function esriSatelliteUrl(opts: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  /** Vertical ground span in meters. ~150 frames a house + yard. */
  spanMeters?: number;
}): string {
  const { lat, lng, width = 640, height = 384, spanMeters = 150 } = opts;

  const latSpanDeg = spanMeters / METERS_PER_LAT_DEG;
  const lngMetersPerDeg = METERS_PER_LAT_DEG * Math.cos((lat * Math.PI) / 180);
  const lngSpanMeters = spanMeters * (width / height);
  const lngSpanDeg = lngSpanMeters / Math.max(lngMetersPerDeg, 1);

  const dLat = latSpanDeg / 2;
  const dLng = lngSpanDeg / 2;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join(',');

  const params = new URLSearchParams({
    bbox,
    bboxSR: '4326',
    imageSR: '3857',
    size: `${width},${height}`,
    format: 'jpg',
    f: 'image',
  });
  return `${ESRI_EXPORT}?${params.toString()}`;
}
