/**
 * Per-service card tints. Stay in the warm-cream/sage family declared by the brand palette.
 * Mounted on cream backgrounds (`#F8F6F1`) — every value below clears WCAG AA against
 * `colors.textPrimary` for body text. Keyed by `ServiceType` string so this file does not
 * import `lib/types.ts` (which is owned by a parallel agent).
 */
export const serviceTints: Record<string, string> = {
  lawn: '#E8F4EC',         // sage
  cleaning: '#FDF3D0',     // cream
  pool: '#DCEEF5',         // pale aqua
  pest: '#F1E6D6',         // sand
  pressure: '#E3EDF5',     // pale slate
  window: '#EAF1F4',       // soft sky
  gutter: '#E6E9DD',       // dusty olive
  detailing: '#EFE6F0',    // muted lavender
  tree: '#DDE7D9',         // forest mist
  solar: '#FAEBC8',        // warm cream-amber
};

export type ServiceTintKey = keyof typeof serviceTints;
