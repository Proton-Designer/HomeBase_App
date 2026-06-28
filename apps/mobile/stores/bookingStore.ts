import { create } from 'zustand';
import type { ServiceType, BookingType, Frequency, PreferredWindow } from '../lib/types';

interface BookingFlowState {
  serviceType: ServiceType | null;
  bookingType: BookingType | null;
  frequency: Frequency | null;
  preferredWindow: PreferredWindow | null;
  scheduledAt: Date | null;
  matchedProviderId: string | null;
  // Set when the booking originates from an accepted custom-job quote — the price the
  // homeowner agreed to. Payment uses this instead of the provider's generic range.
  // May be null even in the quote flow (providers can quote without a price).
  quoteAmountCents: number | null;
  // True when the booking came from an accepted quote — the provider is already chosen,
  // so the match step is skipped. Distinct from quoteAmountCents (which is null for
  // price-free quotes) and from a plain rehire (matchedProviderId set, this false).
  fromQuoteFlow: boolean;
  homeownerId: string | null;
  addressId: string | null;
  addressLabel: string | null;
  specialInstructions: string;
  photoUrl: string | null;

  setServiceType: (t: ServiceType | null) => void;
  setBookingType: (t: BookingType | null) => void;
  setFrequency: (f: Frequency | null) => void;
  setPreferredWindow: (w: PreferredWindow | null) => void;
  setScheduledAt: (d: Date | null) => void;
  setMatchedProvider: (id: string | null) => void;
  setQuoteAmount: (cents: number | null) => void;
  setFromQuoteFlow: (v: boolean) => void;
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
  | 'setPreferredWindow'
  | 'setScheduledAt'
  | 'setMatchedProvider'
  | 'setQuoteAmount'
  | 'setFromQuoteFlow'
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
  preferredWindow: null,
  scheduledAt: null,
  matchedProviderId: null,
  quoteAmountCents: null,
  fromQuoteFlow: false,
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
  setPreferredWindow: (w) => set({ preferredWindow: w }),
  setScheduledAt: (d) => set({ scheduledAt: d }),
  setMatchedProvider: (id) => set({ matchedProviderId: id }),
  setQuoteAmount: (cents) => set({ quoteAmountCents: cents }),
  setFromQuoteFlow: (v) => set({ fromQuoteFlow: v }),
  setHomeownerId: (id) => set({ homeownerId: id }),
  setAddressId: (id) => set({ addressId: id }),
  setAddressLabel: (label) => set({ addressLabel: label }),
  setInstructions: (text) => set({ specialInstructions: text }),
  setPhoto: (url) => set({ photoUrl: url }),
  reset: () => set(initial),
}));
