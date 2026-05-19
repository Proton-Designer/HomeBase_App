import { fetchClaims } from '@/lib/actions';
import { ClaimsClient } from './ClaimsClient';

export const dynamic = 'force-dynamic';

export default async function ClaimsPage() {
  const claims = await fetchClaims();
  return <ClaimsClient claims={claims} />;
}
