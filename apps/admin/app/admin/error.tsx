'use client';

import { useEffect } from 'react';

/**
 * Error boundary for every /admin/* route. Server-action fetchers throw on
 * failure (no silent mock fallback), so this catches them and shows a
 * recoverable state instead of Next.js's default error page.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] route error:', error);
  }, [error]);

  return (
    <div style={{ padding: '3rem', maxWidth: 520 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Something went wrong</h2>
      <p style={{ marginTop: 8, fontSize: 14, color: '#6b6b6b', lineHeight: 1.5 }}>
        This page failed to load — usually a transient database or network issue.
        Try again; if it persists, check the Supabase project status and the
        server logs.
      </p>
      <p style={{ marginTop: 8, fontSize: 12, color: '#a33', fontFamily: 'monospace' }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: 16,
          padding: '8px 18px',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          background: '#1D4ED8',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
