import type { ServiceType } from '../types';

/**
 * Canonical per-service metadata for the home dashboard.
 *
 * - `label`: display name.
 * - `cadenceDays`: typical re-service interval, used to derive "due" reminders
 *   from completion history.
 * - `seasonalMonths`: months (0=Jan) this service is seasonally recommended,
 *   used for cold-start reminders before any history exists.
 */
export const SERVICE_META: Record<
  ServiceType,
  { label: string; cadenceDays: number; seasonalMonths: number[] }
> = {
  lawn:      { label: 'Lawn care',      cadenceDays: 14,  seasonalMonths: [2, 3, 4, 5, 6, 7, 8, 9] },
  cleaning:  { label: 'Home cleaning',  cadenceDays: 14,  seasonalMonths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  pool:      { label: 'Pool service',   cadenceDays: 7,   seasonalMonths: [4, 5, 6, 7, 8] },
  pest:      { label: 'Pest control',   cadenceDays: 90,  seasonalMonths: [2, 3, 4, 5, 6, 7] },
  pressure:  { label: 'Pressure wash',  cadenceDays: 365, seasonalMonths: [3, 4, 5, 6, 7] },
  window:    { label: 'Window cleaning', cadenceDays: 180, seasonalMonths: [2, 3, 4, 9, 10] },
  gutter:    { label: 'Gutter cleaning', cadenceDays: 182, seasonalMonths: [2, 8, 9, 10] },
  detailing: { label: 'Auto detailing', cadenceDays: 90,  seasonalMonths: [3, 4, 5, 6, 7, 8] },
  tree:      { label: 'Tree service',   cadenceDays: 365, seasonalMonths: [0, 1, 11] },
  solar:     { label: 'Solar cleaning', cadenceDays: 180, seasonalMonths: [2, 3, 4] },
};

export function serviceLabel(t: ServiceType): string {
  return SERVICE_META[t]?.label ?? t;
}
