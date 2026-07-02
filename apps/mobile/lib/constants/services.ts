import type { ComponentType } from 'react';
import {
  Leaf,
  Sparkles,
  Waves,
  Bug,
  Droplets,
  SquareDashedBottom as SquareDashed,
  CloudRain,
  Car,
  TreeDeciduous,
  Sun,
} from 'lucide-react-native';
import type { ServiceType } from '../types';

type ServiceIcon = ComponentType<{ size?: number; color?: string }>;

export interface ServiceCatalogEntry {
  id: ServiceType;
  subtitle: string;
  icon: ServiceIcon;
  minPrice: number; // dollars — the "from" price
  maxPrice: number; // dollars
  unit: '/visit' | '/job';
}

/**
 * Single source for per-service metadata: icon, price band, one-line subtitle. Labels
 * live in SERVICE_LABELS (labels.ts) and colour tints in `serviceTints` (tokens); this
 * carries everything else so the catalog/pickers/price-fallbacks can't silently drift.
 * Keyed by ServiceType; SERVICE_IDS gives the canonical ordering.
 */
export const SERVICE_CATALOG: Record<ServiceType, ServiceCatalogEntry> = {
  lawn:      { id: 'lawn',      subtitle: 'Mowing, edging, trimming',           icon: Leaf,          minPrice: 45,  maxPrice: 95,   unit: '/visit' },
  cleaning:  { id: 'cleaning',  subtitle: 'Standard, deep clean, move-in/out',  icon: Sparkles,      minPrice: 80,  maxPrice: 220,  unit: '/visit' },
  pool:      { id: 'pool',      subtitle: 'Weekly skim, chem-balance, filter',  icon: Waves,         minPrice: 35,  maxPrice: 65,   unit: '/visit' },
  pest:      { id: 'pest',      subtitle: 'Quarterly perimeter & interior',     icon: Bug,           minPrice: 85,  maxPrice: 160,  unit: '/visit' },
  pressure:  { id: 'pressure',  subtitle: 'Siding, drives, fences, decks',      icon: Droplets,      minPrice: 220, maxPrice: 450,  unit: '/job' },
  window:    { id: 'window',    subtitle: 'Interior + exterior, screens incl.', icon: SquareDashed,  minPrice: 150, maxPrice: 320,  unit: '/visit' },
  gutter:    { id: 'gutter',    subtitle: 'Spring + fall clear-outs',           icon: CloudRain,     minPrice: 150, maxPrice: 280,  unit: '/visit' },
  detailing: { id: 'detailing', subtitle: 'Mobile interior + exterior',         icon: Car,           minPrice: 150, maxPrice: 400,  unit: '/visit' },
  tree:      { id: 'tree',      subtitle: 'Trim, shape, hazard removal',        icon: TreeDeciduous, minPrice: 250, maxPrice: 1200, unit: '/job' },
  solar:     { id: 'solar',     subtitle: 'Soft-bristle, DI-water rinse',       icon: Sun,           minPrice: 150, maxPrice: 500,  unit: '/visit' },
};

/** Canonical service ordering (matches the ServiceType union). */
export const SERVICE_IDS = Object.keys(SERVICE_CATALOG) as ServiceType[];

/** service-type → icon glyph. Use wherever a service needs its icon. */
export const SERVICE_ICONS: Record<ServiceType, ServiceIcon> = Object.fromEntries(
  SERVICE_IDS.map((id) => [id, SERVICE_CATALOG[id].icon]),
) as Record<ServiceType, ServiceIcon>;

/** "From $45/visit"-style label — the fallback shown when no live floor price exists. */
export function serviceFromPriceLabel(id: ServiceType): string {
  const s = SERVICE_CATALOG[id];
  return `From $${s.minPrice}${s.unit}`;
}
