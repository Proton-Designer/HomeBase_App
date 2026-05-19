import { fetchProviders } from '@/lib/actions';
import { ProvidersClient } from './ProvidersClient';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const providers = await fetchProviders();
  return <ProvidersClient providers={providers} />;
}
