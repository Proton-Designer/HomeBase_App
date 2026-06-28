import { create } from 'zustand';
import * as claimsApi from '../lib/api/claims';
import type { IncidentType, ResolutionKind } from '../lib/types';

interface ClaimDraft {
  jobId: string | null;
  providerId: string | null;
  incidentType: IncidentType | null;
  description: string;
  photoUrls: string[];
  photoLocalUris: string[];
  requestedResolution: ResolutionKind | null;
  requestedAmountCents: number | null;
}

const initialDraft: ClaimDraft = {
  jobId: null,
  providerId: null,
  incidentType: null,
  description: '',
  photoUrls: [],
  photoLocalUris: [],
  requestedResolution: null,
  requestedAmountCents: null,
};

interface ClaimState {
  draft: ClaimDraft;

  setJobContext: (ctx: { jobId: string; providerId: string }) => void;
  setIncidentType: (t: IncidentType) => void;
  setDescription: (d: string) => void;
  addPhoto: (path: string, localUri: string) => void;
  removePhoto: (idx: number) => void;
  setResolution: (kind: ResolutionKind) => void;
  setAmountCents: (n: number | null) => void;
  submitDraft: () => Promise<string>;
  resetDraft: () => void;
}

export const useClaimStore = create<ClaimState>((set, get) => ({
  draft: initialDraft,

  setJobContext: ({ jobId, providerId }) =>
    set((s) => {
      if (s.draft.jobId !== null && s.draft.jobId !== jobId) {
        return { draft: { ...initialDraft, jobId, providerId } };
      }
      return { draft: { ...s.draft, jobId, providerId } };
    }),

  setIncidentType: (t) =>
    set((s) => ({ draft: { ...s.draft, incidentType: t } })),

  setDescription: (d) =>
    set((s) => ({ draft: { ...s.draft, description: d } })),

  addPhoto: (path, localUri) =>
    set((s) => ({
      draft: {
        ...s.draft,
        photoUrls: [...s.draft.photoUrls, path].slice(0, 6),
        photoLocalUris: [...s.draft.photoLocalUris, localUri].slice(0, 6),
      },
    })),

  removePhoto: (idx) =>
    set((s) => ({
      draft: {
        ...s.draft,
        photoUrls: s.draft.photoUrls.filter((_, i) => i !== idx),
        photoLocalUris: s.draft.photoLocalUris.filter((_, i) => i !== idx),
      },
    })),

  setResolution: (kind) =>
    set((s) => ({ draft: { ...s.draft, requestedResolution: kind } })),

  setAmountCents: (n) =>
    set((s) => ({ draft: { ...s.draft, requestedAmountCents: n } })),

  submitDraft: async () => {
    const { draft } = get();
    if (!draft.jobId || !draft.providerId || !draft.incidentType || !draft.requestedResolution) {
      throw new Error('Incomplete claim draft');
    }
    const result = await claimsApi.create({
      jobId: draft.jobId,
      providerId: draft.providerId,
      incidentType: draft.incidentType,
      description: draft.description,
      photoUrls: draft.photoUrls,
      requestedResolution: draft.requestedResolution,
      requestedAmountCents: draft.requestedAmountCents,
    });
    set({ draft: initialDraft });
    return result.id;
  },

  resetDraft: () => set({ draft: initialDraft }),
}));
