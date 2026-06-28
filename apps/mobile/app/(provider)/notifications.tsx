import React from 'react';
import { NotificationCenter } from '../../components/notifications/NotificationCenter';
import type { AppNotification } from '../../lib/api/notifications';

function resolveHref(n: AppNotification): string | null {
  const threadId = n.data?.threadId as string | undefined;
  if (threadId) return `/(provider)/thread/${threadId}`;

  switch (n.type) {
    case 'booking_matched':
      return '/(provider)/requests';
    case 'booking_confirmed':
    case 'booking_declined':
    case 'booking_cancelled':
      return '/(provider)/(tabs)/schedule';
    case 'payout_sent':
    case 'instant_payout_ready':
      return '/(provider)/(tabs)/earnings';
    case 'claim_update':
      return '/(provider)/(tabs)/jobs';
    case 'verification_approved':
      return '/(provider)/(tabs)/profile';
    default:
      return null;
  }
}

export default function ProviderNotificationsScreen() {
  return <NotificationCenter resolveHref={resolveHref} />;
}
