import { supabase } from '../supabase';

export interface PrimaryAddressResult {
  homeownerId: string;
  addressId: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export async function fetchPrimaryAddress(userId: string): Promise<PrimaryAddressResult | null> {
  const { data: homeowner, error: hwErr } = await supabase
    .from('homeowners')
    .select('id, primary_address_id')
    .eq('id', userId)
    .maybeSingle();

  if (hwErr || !homeowner || !homeowner.primary_address_id) return null;

  const { data: address, error: addrErr } = await supabase
    .from('addresses')
    .select('id, street, city, state, zip')
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
  };
}
