import { create } from 'zustand';
import type { ServiceType, BookingType, Frequency } from '../lib/types';

interface BookingFlowState {
  serviceType: ServiceType | null;
  bookingType: BookingType | null;
  frequency: Frequency | null;
  scheduledAt: Date | null;
  matchedProviderId: string | null;
  homeownerId: string | null;
  addressId: string | null;
  addressLabel: string | null;
  specialInstructions: string;
  photoUrl: string | null;

  setServiceType: (t: ServiceType | null) => void;
  setBookingType: (t: BookingType | null) => void;
  setFrequency: (f: Frequency | null) => void;
  setScheduledAt: (d: Date | null) => void;
  setMatchedProvider: (id: string | null) => void;
  setHomeownerId: (id: string | null) => void;
  setAddressId: (id: string | null) => void;
  setAddressLabel: (label: string | null) => void;
  setInstructions: (text: string) => void;
  setPhoto: (url: string | null) => void;
  reset: () => void;
}

const initial: Omit<
  BookingFlowState,
  | 'setServiceType'
  | 'setBookingType'
  | 'setFrequency'
  | 'setScheduledAt'
  | 'setMatchedProvider'
  | 'setHomeownerId'
  | 'setAddressId'
  | 'setAddressLabel'
  | 'setInstructions'
  | 'setPhoto'
  | 'reset'
> = {
  serviceType: null,
  bookingType: null,
  frequency: null,
  scheduledAt: null,
  matchedProviderId: null,
  homeownerId: null,
  addressId: null,
  addressLabel: null,
  specialInstructions: '',
  photoUrl: null,
};

export const useBookingStore = create<BookingFlowState>((set) => ({
  ...initial,
  setServiceType: (t) => set({ serviceType: t }),
  setBookingType: (t) => set({ bookingType: t }),
  setFrequency: (f) => set({ frequency: f }),
  setScheduledAt: (d) => set({ scheduledAt: d }),
  setMatchedProvider: (id) => set({ matchedProviderId: id }),
  setHomeownerId: (id) => set({ homeownerId: id }),
  setAddressId: (id) => set({ addressId: id }),
  setAddressLabel: (label) => set({ addressLabel: label }),
  setInstructions: (text) => set({ specialInstructions: text }),
  setPhoto: (url) => set({ photoUrl: url }),
  reset: () => set(initial),
}));
