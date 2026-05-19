import { create } from 'zustand';
import type { Job, JobStatus } from '../lib/types';

interface JobState {
  activeJobs: Job[];
  jobStatusById: Record<string, JobStatus>;

  setActiveJobs: (jobs: Job[]) => void;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
}

export const useJobStore = create<JobState>((set) => ({
  activeJobs: [],
  jobStatusById: {},
  setActiveJobs: (jobs) =>
    set({
      activeJobs: jobs,
      jobStatusById: jobs.reduce<Record<string, JobStatus>>((acc, j) => {
        acc[j.id] = j.status;
        return acc;
      }, {}),
    }),
  updateJobStatus: (jobId, status) =>
    set((s) => ({
      jobStatusById: { ...s.jobStatusById, [jobId]: status },
      activeJobs: s.activeJobs.map((j) =>
        j.id === jobId ? { ...j, status } : j
      ),
    })),
}));
