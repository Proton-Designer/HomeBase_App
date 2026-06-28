import type { Job, JobStatus } from '../types';

const ACTIVE_STATUSES: JobStatus[] = ['booked', 'confirmed', 'en_route', 'in_progress'];
const LIVE_STATUSES: JobStatus[] = ['en_route', 'in_progress'];

// Lower = more urgent / more "live".
const URGENCY: Record<JobStatus, number> = {
  in_progress: 0,
  en_route: 1,
  confirmed: 2,
  booked: 3,
  completed: 9,
  cancelled: 9,
};

/** A job currently happening — provider en route or on-site. Drives the live hero. */
export function isLiveJob(job: Job): boolean {
  return LIVE_STATUSES.includes(job.status);
}

/**
 * Selects the single job to feature in the home hero: the most urgent active job
 * (in_progress > en_route > confirmed > booked), tie-broken by soonest schedule.
 * Returns null when nothing is active.
 */
export function pickPrimaryActiveJob(jobs: Job[]): Job | null {
  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  if (active.length === 0) return null;
  return active.sort((a, b) => {
    const byUrgency = URGENCY[a.status] - URGENCY[b.status];
    if (byUrgency !== 0) return byUrgency;
    return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
  })[0];
}
