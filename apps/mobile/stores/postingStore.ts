import { create } from 'zustand';
import type { ServiceType } from '../lib/types';

interface PostingDraft {
  serviceType: ServiceType | null;
  headline: string;
  description: string;
  photos: string[];
}

const initialDraft: PostingDraft = {
  serviceType: null,
  headline: '',
  description: '',
  photos: [],
};

interface PostingState {
  draft: PostingDraft;

  setServiceType: (s: ServiceType) => void;
  setHeadline: (h: string) => void;
  setDescription: (d: string) => void;
  addPhoto: (url: string) => void;
  removePhoto: (index: number) => void;
  resetDraft: () => void;
}

export const usePostingStore = create<PostingState>((set) => ({
  draft: initialDraft,

  setServiceType: (s) => set((st) => ({ draft: { ...st.draft, serviceType: s } })),
  setHeadline: (h) => set((st) => ({ draft: { ...st.draft, headline: h } })),
  setDescription: (d) => set((st) => ({ draft: { ...st.draft, description: d } })),
  addPhoto: (url) =>
    set((st) => ({
      draft: { ...st.draft, photos: [...st.draft.photos, url].slice(0, 4) },
    })),
  removePhoto: (index) =>
    set((st) => ({
      draft: {
        ...st.draft,
        photos: st.draft.photos.filter((_, i) => i !== index),
      },
    })),
  resetDraft: () => set({ draft: initialDraft }),
}));
