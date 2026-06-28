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

export interface ProviderAvailabilityDraft {
  activeDays: number[];
  start: string;
  end: string;
}

interface ProviderOnboardingState {
  business: ProviderBusinessDetails;
  serviceArea: ProviderServiceAreaDraft;
  availability: ProviderAvailabilityDraft;
  /** Set once the `providers` row is created (at the availability step). */
  providerId: string | null;
  setBusiness: (patch: Partial<ProviderBusinessDetails>) => void;
  setServiceArea: (patch: Partial<ProviderServiceAreaDraft>) => void;
  setAvailability: (patch: Partial<ProviderAvailabilityDraft>) => void;
  setProviderId: (id: string | null) => void;
  reset: () => void;
}

const makeInitial = () => ({
  business: {
    businessName: '',
    serviceTypes: ['lawn'],
    yearsInBusiness: null,
    employees: null,
    phone: '',
  } as ProviderBusinessDetails,
  serviceArea: { zip: '', radiusMiles: 15 } as ProviderServiceAreaDraft,
  availability: {
    activeDays: [0, 1, 2, 3, 4],
    start: '08:00',
    end: '17:00',
  } as ProviderAvailabilityDraft,
  providerId: null as string | null,
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
      setAvailability: (patch) => set((s) => ({ availability: { ...s.availability, ...patch } })),
      setProviderId: (providerId) => set({ providerId }),
      reset: () => set(makeInitial()),
    }),
    {
      name: 'provider-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
