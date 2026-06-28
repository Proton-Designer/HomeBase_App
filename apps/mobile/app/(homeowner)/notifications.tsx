import React from 'react';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import type { AppNotification } from '../../lib/api/notifications';

function resolveHref(n: AppNotification): string | null {
  const jobId = n.data?.jobId as string | undefined;
  if (jobId) return `/(homeowner)/job/${jobId}`;
  const postingId = n.data?.postingId as string | undefined;
  if (postingId) return `/(homeowner)/postings/${postingId}`;
  return null;
}

export default function HomeownerNotificationsScreen() {
  return <NotificationCenter resolveHref={resolveHref} />;
}
