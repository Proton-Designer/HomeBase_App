import type { ServiceType } from '../types';
import type { CompletionRow } from '../api/completions';
import type { HomeServiceStatus } from '../api/homeServiceStatus';
import { SERVICE_META, serviceLabel } from './serviceMeta';

export type ReminderStatus = 'overdue' | 'due_soon' | 'recommended';

export interface Reminder {
  id: string;
  serviceType: ServiceType;
  title: string;
  reason: string;
  status: ReminderStatus;
}

const DAY_MS = 86_400_000;
const DUE_SOON_WINDOW_DAYS = 14;
const MAX_REMINDERS = 4;

const STATUS_RANK: Record<ReminderStatus, number> = {
  overdue: 0,
  due_soon: 1,
  recommended: 2,
};

function isServiceType(s: string): s is ServiceType {
  return s in SERVICE_META;
}

function cadenceLabel(days: number): string {
  if (days <= 10) return 'weekly';
  if (days <= 20) return 'every couple weeks';
  if (days <= 45) return 'monthly';
  if (days <= 100) return 'quarterly';
  if (days <= 200) return 'twice a year';
  return 'yearly';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Derives maintenance reminders for the home screen.
 *
 * History-driven first: for each service with completions, compare days-since
 * against the typical cadence to flag `overdue`/`due_soon`. Then cold-start:
 * for the homeowner's stated service interests with no recent history, surface
 * a `recommended` reminder when the current month is in-season (falling back to
 * the first interests so a new user never sees an empty section).
 *
 * Pure and deterministic given `now` — no clock reads inside.
 */
export function computeReminders(input: {
  serviceInterests: string[];
  completions: CompletionRow[];
  now: Date;
  statuses?: HomeServiceStatus[];
}): Reminder[] {
  const { serviceInterests, completions, now, statuses = [] } = input;
  const month = now.getMonth();
  const nowTs = now.getTime();
  const reminders: Reminder[] = [];
  const used = new Set<ServiceType>();

  // Per-service confirm-loop state (self-reports, mutes, snoozes, cadence overrides).
  const statusByService = new Map<ServiceType, HomeServiceStatus>();
  for (const s of statuses) {
    if (isServiceType(s.serviceType)) statusByService.set(s.serviceType, s);
  }
  // Suppressed = the homeowner muted it ("I handle this myself" / "not applicable")
  // or snoozed it ("remind me later") and the snooze hasn't elapsed.
  const isSuppressed = (svc: ServiceType): boolean => {
    const st = statusByService.get(svc);
    if (!st) return false;
    if (st.state === 'self_managed' || st.state === 'not_applicable') return true;
    if (st.snoozedUntil && new Date(st.snoozedUntil).getTime() > nowTs) return true;
    if ((st.dismissCount ?? 0) >= 2) return true;
    return false;
  };
  const cadenceFor = (svc: ServiceType): number =>
    statusByService.get(svc)?.cadenceDaysOverride ?? SERVICE_META[svc].cadenceDays;

  // Most-recent service per type = max(platform completion, self-reported "handled").
  const lastByService = new Map<ServiceType, number>();
  for (const c of completions) {
    if (!isServiceType(c.serviceType)) continue;
    const t = new Date(c.completedAt).getTime();
    const prev = lastByService.get(c.serviceType);
    if (prev === undefined || t > prev) lastByService.set(c.serviceType, t);
  }
  for (const s of statuses) {
    if (!isServiceType(s.serviceType) || !s.lastServicedAt) continue;
    const t = new Date(s.lastServicedAt).getTime();
    const prev = lastByService.get(s.serviceType);
    if (prev === undefined || t > prev) lastByService.set(s.serviceType, t);
  }

  // 1. History-driven: overdue / due soon.
  for (const [serviceType, lastTs] of lastByService) {
    if (isSuppressed(serviceType)) continue;
    const cadenceDays = cadenceFor(serviceType);
    const daysSince = Math.floor((now.getTime() - lastTs) / DAY_MS);
    const dueIn = cadenceDays - daysSince;
    // "Due soon" window scales with cadence so a *just-serviced* short-cadence
    // item (e.g. lawn, 14d) doesn't immediately reappear as due. Clamp to half
    // the cadence, capped at DUE_SOON_WINDOW_DAYS.
    const dueSoonWindow = Math.min(DUE_SOON_WINDOW_DAYS, Math.ceil(cadenceDays / 2));
    if (dueIn > dueSoonWindow) continue; // not due yet
    const status: ReminderStatus = dueIn <= 0 ? 'overdue' : 'due_soon';
    reminders.push({
      id: `${serviceType}:${status}`,
      serviceType,
      title: serviceLabel(serviceType),
      reason:
        status === 'overdue'
          ? `Last done ${daysSince}d ago · usually ${cadenceLabel(cadenceDays)}`
          : `Due soon · last done ${daysSince}d ago`,
      status,
    });
    used.add(serviceType);
  }

  // 2. Cold-start: recommended for stated interests not already covered.
  // Exclude anything with service history — the history branch above already
  // decided whether it's due; don't resurrect an on-track item as "suggested".
  const interests = serviceInterests
    .filter(isServiceType)
    .filter((s) => !used.has(s) && !isSuppressed(s) && !lastByService.has(s));
  const inSeason = interests.filter((s) => SERVICE_META[s].seasonalMonths.includes(month));
  const pickOrder = inSeason.length > 0 ? inSeason : interests;
  for (const serviceType of pickOrder) {
    if (used.has(serviceType)) continue;
    const seasonal = SERVICE_META[serviceType].seasonalMonths.includes(month);
    reminders.push({
      id: `${serviceType}:recommended`,
      serviceType,
      title: serviceLabel(serviceType),
      reason: seasonal ? `In season for ${MONTH_NAMES[month]}` : 'Recommended for your home',
      status: 'recommended',
    });
    used.add(serviceType);
  }

  reminders.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  return reminders.slice(0, MAX_REMINDERS);
}
