import { fetchTrustScores } from '@/lib/actions';
import { TrustScoresClient } from './TrustScoresClient';

export const dynamic = 'force-dynamic';

export default async function TrustScoresPage() {
  const trustScores = await fetchTrustScores();
  return <TrustScoresClient trustScores={trustScores} />;
}
