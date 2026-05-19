'use client';

import { useEffect } from 'react';

/**
 * Catches errors thrown in the root layout itself (which app/admin/error.tsx
 * cannot reach). Must render its own <html>/<body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '3rem',
          maxWidth: 520,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          The dashboard failed to load
        </h2>
        <p style={{ marginTop: 8, fontSize: 14, color: '#6b6b6b', lineHeight: 1.5 }}>
          An unexpected error occurred while starting the app. Try again, then
          check the server logs if it persists.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: 16,
            padding: '8px 18px',
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            background: '#1f5e3f',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
