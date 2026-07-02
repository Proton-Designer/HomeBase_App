import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProviderBusinessDetails {
  businessName: string;
  serviceTypes: string[];
  yearsInBusiness: string | null;
  employees: string | null;
  phone: string;
}

export interface ProviderServiceAreaDraft {
  zip: string;
  radiusMiles: number;
}

interface ProviderOnboardingState {
  business: ProviderBusinessDetails;
  serviceArea: ProviderServiceAreaDraft;
  /** Set once the `providers` row is created (at the service-area step). */
  providerId: string | null;
  /** Last onboarding step the user was on, so Save & exit → reopen resumes there. */
  lastStep: string;
  setBusiness: (patch: Partial<ProviderBusinessDetails>) => void;
  setServiceArea: (patch: Partial<ProviderServiceAreaDraft>) => void;
  setProviderId: (id: string | null) => void;
  setLastStep: (step: string) => void;
  reset: () => void;
}

const makeInitial = () => ({
  business: {
    businessName: '',
    serviceTypes: [],
    yearsInBusiness: null,
    employees: null,
    phone: '',
  } as ProviderBusinessDetails,
  serviceArea: { zip: '', radiusMiles: 15 } as ProviderServiceAreaDraft,
  providerId: null as string | null,
  lastStep: 'business' as string,
});

// Persisted so a refresh / app-reopen mid-onboarding keeps the draft. Without this, the
// steps re-seed from an empty store and `onboard()` would overwrite the partially-written
// providers row with placeholder data ("My Business", default radius). Cleared on
// completion (profile step) and on sign-out.
export const useProviderOnboardingStore = create<ProviderOnboardingState>()(
  persist(
    (set) => ({
      ...makeInitial(),
      setBusiness: (patch) => set((s) => ({ business: { ...s.business, ...patch } })),
      setServiceArea: (patch) => set((s) => ({ serviceArea: { ...s.serviceArea, ...patch } })),
      setProviderId: (providerId) => set({ providerId }),
      setLastStep: (lastStep) => set({ lastStep }),
      reset: () => set(makeInitial()),
    }),
    {
      name: 'provider-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
