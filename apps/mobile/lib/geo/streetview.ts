const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Initial compass bearing (deg, 0–360) from one coordinate to another. */
export function bearing(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

interface StreetViewMeta {
  status: string;
  location?: { lat: number; lng: number };
}

/**
 * Resolves a Google Street View Static image URL framing the house front, or null.
 *
 * Two steps: (1) the free metadata endpoint reports whether a panorama exists near
 * the home and where it sits; (2) we aim the camera from that panorama toward the
 * house (heading = bearing pano→house) so the image shows the facade, not the road.
 *
 * Returns null when no key is configured, no imagery exists, or the request fails —
 * the caller falls back to the satellite view. Never throws.
 */
export async function resolveStreetViewUrl(opts: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  signal?: AbortSignal;
}): Promise<string | null> {
  const { lat, lng, width = 640, height = 300, signal } = opts;
  if (!GOOGLE_KEY) return null;
  try {
    const metaUrl =
      `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}` +
      `&source=outdoor&key=${GOOGLE_KEY}`;
    const res = await fetch(metaUrl, { signal });
    if (!res.ok) return null;
    const meta = (await res.json()) as StreetViewMeta;
    if (meta.status !== 'OK' || !meta.location) return null;

    const heading = Math.round(bearing(meta.location.lat, meta.location.lng, lat, lng));
    const params = new URLSearchParams({
      size: `${width}x${height}`,
      location: `${lat},${lng}`,
      heading: String(heading),
      pitch: '0',
      fov: '80',
      source: 'outdoor',
      key: GOOGLE_KEY,
    });
    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  } catch {
    return null;
  }
}
