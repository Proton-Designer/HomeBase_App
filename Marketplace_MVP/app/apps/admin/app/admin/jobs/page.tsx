import { fetchJobs } from '@/lib/actions';
import { JobsClient } from './JobsClient';

export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  const initialJobs = await fetchJobs();

  // The anon key is safe to forward to the client — it's already public.
  // The service-role key never leaves the server.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return (
    <JobsClient
      initialJobs={initialJobs}
      supabaseUrl={supabaseUrl}
      supabaseAnonKey={supabaseAnonKey}
    />
  );
}
