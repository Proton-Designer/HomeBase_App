import { toStateAbbr } from './states';

/** A single address suggestion resolved from the Photon (OpenStreetMap) geocoder. */
export interface AddressSuggestion {
  /** Stable key for lists — OSM id, or a composed fallback. */
  id: string;
  /** Single-line display label, e.g. "123 Maple Dr, Austin, TX 78701". */
  label: string;
  street: string;
  city: string;
  state: string; // 2-letter
  zip: string;
  lat: number;
  lng: number;
}

const PHOTON_URL = 'https://photon.komoot.io/api/';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function toSuggestion(f: PhotonFeature): AddressSuggestion | null {
  const p = f.properties ?? {};
  const coords = f.geometry?.coordinates;
  if (!coords || coords.length !== 2) return null;
  const [lng, lat] = coords;

  const housenumber = str(p.housenumber);
  const street = str(p.street) || str(p.name);
  if (!street) return null;

  const line1 = [housenumber, street].filter(Boolean).join(' ');
  const city = str(p.city) || str(p.town) || str(p.village) || str(p.county);
  const state = toStateAbbr(str(p.state));
  const zip = str(p.postcode);

  const label = [line1, city, [state, zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

  return {
    id: str(p.osm_id) || `${lat},${lng},${line1}`,
    label,
    street: line1,
    city,
    state,
    zip,
    lat,
    lng,
  };
}

/**
 * Address autocomplete via Photon (OSM) — keyless, no account. Returns US-biased
 * address suggestions for the query. Empty array on any failure (never throws).
 */
export async function searchAddresses(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=6&lang=en`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const json = (await res.json()) as { features?: PhotonFeature[] };
    const all = (json.features ?? [])
      .map(toSuggestion)
      .filter((s): s is AddressSuggestion => s !== null);
    // Prefer fully-formed US addresses (street + city + state + zip).
    const complete = all.filter((s) => s.city && s.state && s.zip);
    return (complete.length > 0 ? complete : all).slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Geocodes a one-line address to coordinates (for legacy rows saved before
 * autocomplete captured lat/lng). Returns null on any failure.
 */
export async function geocodeAddress(
  formatted: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lng: number } | null> {
  const results = await searchAddresses(formatted, signal);
  if (results.length === 0) return null;
  return { lat: results[0].lat, lng: results[0].lng };
}
