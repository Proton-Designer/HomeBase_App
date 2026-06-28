import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase';

interface TypingPresence {
  user_id: string;
  typing: boolean;
}

/**
 * Supabase Realtime Presence hook for per-thread typing indicators (§6.3).
 *
 * Security note: the presence channel `thread:presence:{jobId}` has no RLS
 * equivalent. Any authenticated user who knows a jobId can join. The typing
 * indicator leaks nothing but "someone is typing." Flagged for security review
 * before scale.
 */
export function useTypingPresence(jobId: string, myUserId: string | null) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastRef = useRef(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId || !myUserId) return;

    const channel = supabase.channel(`thread:presence:${jobId}`);
    channelRef.current = channel;

    const syncOtherTyping = () => {
      const state = channel.presenceState<TypingPresence>();
      const otherTyping = Object.values(state).some((presences) =>
        presences.some(
          (p) =>
            (p as unknown as TypingPresence).user_id !== myUserId &&
            (p as unknown as TypingPresence).typing === true,
        ),
      );
      setIsOtherTyping(otherTyping);
    };

    channel
      .on('presence', { event: 'sync' }, syncOtherTyping)
      .on('presence', { event: 'join' }, syncOtherTyping)
      .on('presence', { event: 'leave' }, syncOtherTyping)
      .subscribe();

    return () => {
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [jobId, myUserId]);

  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      const channel = channelRef.current;
      if (!channel || !myUserId) return;

      const now = Date.now();
      // Throttle: broadcast at most once per second while typing.
      if (isTyping && now - lastBroadcastRef.current < 1000) return;
      lastBroadcastRef.current = now;

      void channel.track({ user_id: myUserId, typing: isTyping });

      if (isTyping) {
        // Auto-stop after 2 s of no new keystrokes.
        if (autoStopRef.current) clearTimeout(autoStopRef.current);
        autoStopRef.current = setTimeout(() => {
          void channelRef.current?.track({ user_id: myUserId, typing: false });
        }, 2000);
      }
    },
    [myUserId],
  );

  return { isOtherTyping, broadcastTyping };
}
