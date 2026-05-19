import type { CompositeScore, ServiceType } from '../types';

export const WEIGHTS_BY_SERVICE: Record<
  ServiceType,
  { reliability: number; quality: number; communication: number; professionalism: number }
> = {
  lawn:      { reliability: 0.35, quality: 0.30, communication: 0.15, professionalism: 0.20 },
  cleaning:  { reliability: 0.15, quality: 0.40, communication: 0.20, professionalism: 0.25 },
  pool:      { reliability: 0.40, quality: 0.30, communication: 0.20, professionalism: 0.10 },
  pest:      { reliability: 0.20, quality: 0.30, communication: 0.35, professionalism: 0.15 },
  pressure:  { reliability: 0.20, quality: 0.40, communication: 0.15, professionalism: 0.25 },
  window:    { reliability: 0.20, quality: 0.35, communication: 0.15, professionalism: 0.30 },
  gutter:    { reliability: 0.35, quality: 0.30, communication: 0.15, professionalism: 0.20 },
  detailing: { reliability: 0.15, quality: 0.45, communication: 0.15, professionalism: 0.25 },
  tree:      { reliability: 0.15, quality: 0.30, communication: 0.15, professionalism: 0.40 },
  solar:     { reliability: 0.25, quality: 0.20, communication: 0.15, professionalism: 0.40 },
};

export function computeWeightedScore(scores: CompositeScore, serviceType: ServiceType): number {
  const w = WEIGHTS_BY_SERVICE[serviceType];
  return (
    scores.reliability * w.reliability +
    scores.quality * w.quality +
    scores.communication * w.communication +
    scores.professionalism * w.professionalism
  );
}
