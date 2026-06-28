import React from 'react';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import type { AppNotification } from '../../lib/api/notifications';

function resolveHref(n: AppNotification): string | null {
  const threadId = n.data?.threadId as string | undefined;
  if (threadId) return `/(provider)/thread/${threadId}`;
  return null;
}

export default function ProviderNotificationsScreen() {
  return <NotificationCenter resolveHref={resolveHref} />;
}
