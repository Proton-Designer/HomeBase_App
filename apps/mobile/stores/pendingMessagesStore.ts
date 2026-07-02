import { create } from 'zustand';
import type { ThreadMessage } from '../lib/messaging/useThreadMessages';

interface PendingMessagesState {
  // Optimistic/failed messages per jobId. Held here (not in thread-screen component
  // state) so a failed send survives navigating away and back instead of vanishing.
  queues: Record<string, ThreadMessage[]>;
  set: (jobId: string, msgs: ThreadMessage[]) => void;
  clear: (jobId: string) => void;
}

export const usePendingMessages = create<PendingMessagesState>((set) => ({
  queues: {},
  set: (jobId, msgs) => set((s) => ({ queues: { ...s.queues, [jobId]: msgs } })),
  clear: (jobId) =>
    set((s) => {
      if (!(jobId in s.queues)) return s;
      const { [jobId]: _removed, ...rest } = s.queues;
      return { queues: rest };
    }),
}));
