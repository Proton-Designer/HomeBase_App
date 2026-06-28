/**
 * Per-service card tints. Cool, light per-service tints designed for the near-white background.
 * Mounted on `#F5F8FF` — every value below clears WCAG AA against
 * `colors.textPrimary` for body text. Keyed by `ServiceType` string so this file does not
 * import `lib/types.ts` (which is owned by a parallel agent).
 */
export const serviceTints: Record<string, string> = {
  lawn: '#EAF3EC',         // soft green
  cleaning: '#EAF1FB',     // pale blue
  pool: '#DCEEF5',         // pale aqua
  pest: '#ECEFF4',         // cool grey
  pressure: '#E3EDF5',     // pale slate
  window: '#EAF1F4',       // soft sky
  gutter: '#E7EBF0',       // light blue-grey
  detailing: '#EFE6F0',    // muted lavender
  tree: '#DEE8DA',         // soft green-grey
  solar: '#FAEBC8',        // warm cream-amber
};

export type ServiceTintKey = keyof typeof serviceTints;
