import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listForJobPage, send as apiSend, markRead, type Message } from '../api/messages';
import { subscribeToMessages } from '../api/realtime';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../types';

export type MessageStatus = 'sending' | 'failed' | 'sent';

// A message as the UI sees it: a server row, or an optimistic one not yet
// confirmed. `status` is set only while a send is in flight or has failed.
export interface ThreadMessage extends Message {
  status?: MessageStatus;
}

function genClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC-4122 v4 fallback — must be a valid UUID since messages.client_id is a uuid column.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Single source of truth for a job's message thread: server fetch + realtime,
 * plus optimistic send with client-id dedup and tap-to-retry on failure.
 *
 * Additions (§6.2, §6.5):
 * - Keyset pagination via listForJobPage (initial load = last 30; loadOlder prepends).
 * - `unreadDividerId` captured once on first data load, before markRead (500ms delay).
 * - `lastReadMessageId` derived from messages: last my message with readAt stamped.
 * - Read-receipt UPDATE subscription wired through subscribeToMessages.
 */
export function useThreadMessages({ jobId, fromRole }: { jobId: string; fromRole: UserRole }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id ?? null);

  // ─── Server data (latest page) ───────────────────────────────────────────
  const { data: latestPage } = useQuery({
    queryKey: ['messages', jobId],
    queryFn: () => listForJobPage(jobId, { limit: 30 }),
    enabled: !!jobId,
  });

  // Older pages prepended when user pulls to load more.
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    if (latestPage) setHasMore(latestPage.hasMore);
  }, [latestPage]);

  const serverMessages = useMemo<Message[]>(() => {
    return [...olderMessages, ...(latestPage?.messages ?? [])];
  }, [olderMessages, latestPage]);

  // ─── Optimistic / unconfirmed messages ───────────────────────────────────
  const [pending, setPending] = useState<ThreadMessage[]>([]);

  // Drop any optimistic copy once its confirmed row arrives from the server.
  useEffect(() => {
    if (!serverMessages.length) return;
    const confirmed = new Set(
      serverMessages.map((m) => m.clientId).filter(Boolean) as string[],
    );
    setPending((p) => p.filter((m) => !(m.clientId && confirmed.has(m.clientId))));
  }, [serverMessages]);

  // ─── Unread divider (§4.6) ───────────────────────────────────────────────
  // Captured once on first data load; never updated after that.
  const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null);
  const capturedUnreadRef = useRef(false);

  useEffect(() => {
    if (capturedUnreadRef.current || !serverMessages.length || !jobId) return;
    capturedUnreadRef.current = true;

    // Find the first message from the other party that hasn't been read yet.
    const firstUnread = serverMessages.find(
      (m) => m.fromUserId !== currentUserId && !m.readAt,
    );
    setUnreadDividerId(firstUnread?.id ?? null);

    // Delay markRead by 500ms so the UI renders the divider before clearing it.
    const timer = setTimeout(() => void markRead(jobId), 500);
    return () => clearTimeout(timer);
  }, [serverMessages, jobId, currentUserId]);

  // ─── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;
    const unsub = subscribeToMessages(
      jobId,
      (incoming) => {
        void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
        void queryClient.invalidateQueries({ queryKey: ['threads'] });
        // Echo of our own optimistic message → remove the optimistic copy.
        if (incoming.clientId) {
          setPending((p) => p.filter((m) => m.clientId !== incoming.clientId));
        }
      },
      (_messageId) => {
        // Other party marked our message as read — refetch for fresh readAt stamps.
        void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
      },
    );
    return unsub;
  }, [jobId, queryClient]);

  // ─── Pagination ──────────────────────────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!hasMore || isLoadingOlder) return;
    const oldest = serverMessages[0];
    if (!oldest) return;

    setIsLoadingOlder(true);
    try {
      const { messages: older, hasMore: moreOlder } = await listForJobPage(jobId, {
        before: oldest.sentAt,
        limit: 30,
      });
      setOlderMessages((prev) => [...older, ...prev]);
      setHasMore(moreOlder);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [jobId, hasMore, isLoadingOlder, serverMessages]);

  // ─── Send / retry ─────────────────────────────────────────────────────────
  const deliver = useCallback(
    async (clientId: string, body: string) => {
      try {
        await apiSend({ jobId, body, fromRole, clientId });
        setPending((p) =>
          p.map((m) => (m.clientId === clientId ? { ...m, status: 'sent' as const } : m)),
        );
        void queryClient.invalidateQueries({ queryKey: ['messages', jobId] });
        void queryClient.invalidateQueries({ queryKey: ['threads'] });
      } catch {
        setPending((p) =>
          p.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' as const } : m)),
        );
      }
    },
    [jobId, fromRole, queryClient],
  );

  const send = useCallback(
    (body: string) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const clientId = genClientId();
      const optimistic: ThreadMessage = {
        id: clientId,
        jobId,
        fromUserId: currentUserId ?? '',
        fromRole,
        body: trimmed,
        sentAt: new Date().toISOString(),
        readAt: null,
        clientId,
        status: 'sending',
      };
      setPending((p) => [...p, optimistic]);
      void deliver(clientId, trimmed);
    },
    [jobId, fromRole, currentUserId, deliver],
  );

  const retry = useCallback(
    (clientId: string) => {
      const msg = pending.find((m) => m.clientId === clientId);
      if (!msg) return;
      setPending((p) =>
        p.map((m) => (m.clientId === clientId ? { ...m, status: 'sending' as const } : m)),
      );
      void deliver(clientId, msg.body);
    },
    [pending, deliver],
  );

  // ─── Combined messages (server + optimistic, sorted) ─────────────────────
  const messages = useMemo<ThreadMessage[]>(() => {
    const confirmed = new Set(
      serverMessages.map((m) => m.clientId).filter(Boolean) as string[],
    );
    const extras = pending.filter((m) => !(m.clientId && confirmed.has(m.clientId)));
    return [...serverMessages, ...extras].sort((a, b) =>
      a.sentAt === b.sentAt ? (a.id < b.id ? -1 : 1) : a.sentAt < b.sentAt ? -1 : 1,
    );
  }, [serverMessages, pending]);

  // ─── Last read message ID (for "Seen" indicator §4.7) ────────────────────
  const lastReadMessageId = useMemo<string | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.fromUserId === currentUserId && m.readAt) return m.id;
    }
    return null;
  }, [messages, currentUserId]);

  return {
    messages,
    send,
    retry,
    hasMore,
    loadOlder,
    isLoadingOlder,
    unreadDividerId,
    lastReadMessageId,
    markRead: useCallback(() => markRead(jobId), [jobId]),
  };
}
