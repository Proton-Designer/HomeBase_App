import { supabase } from '../supabase';

export interface PrimaryAddressResult {
  homeownerId: string;
  addressId: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  serviceInterests: string[];
}

/** Single-line address label, e.g. "123 Maple Dr, Austin, TX 78701". */
export function formatAddress(
  a: Pick<PrimaryAddressResult, 'street' | 'city' | 'state' | 'zip'>,
): string {
  return [a.street, a.city, [a.state, a.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

export async function fetchPrimaryAddress(userId: string): Promise<PrimaryAddressResult | null> {
  const { data: homeowner, error: hwErr } = await supabase
    .from('homeowners')
    .select('id, primary_address_id, service_interests')
    .eq('id', userId)
    .maybeSingle();

  if (hwErr || !homeowner || !homeowner.primary_address_id) return null;

  const { data: address, error: addrErr } = await supabase
    .from('addresses')
    .select('id, street, city, state, zip, neighborhood, lat, lng')
    .eq('id', homeowner.primary_address_id)
    .maybeSingle();

  if (addrErr || !address) return null;

  return {
    homeownerId: homeowner.id as string,
    addressId: address.id as string,
    street: address.street as string,
    city: address.city as string,
    state: address.state as string,
    zip: address.zip as string,
    neighborhood: (address.neighborhood as string | null) ?? null,
    lat: (address.lat as number | null) ?? null,
    lng: (address.lng as number | null) ?? null,
    serviceInterests: (homeowner.service_interests as string[] | null) ?? [],
  };
}
