'use client';

import { useMemo, useState, useTransition } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronRight, ShieldCheck, ShieldAlert, Mail } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { type ProviderQueueRow, type ProviderQueueStatus } from '@/lib/admin-types';
import { overrideVerificationTier } from '@/lib/actions';
import { cn } from '@/lib/cn';

type Tab = 'all' | 'pending' | 'verified' | 'suspended';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending Review' },
  { id: 'verified', label: 'Verified' },
  { id: 'suspended', label: 'Suspended' },
];

const STATUS_TONE: Record<ProviderQueueStatus, 'neutral' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  verified: 'success',
  suspended: 'error',
};

export function ProvidersClient({ providers }: { providers: ProviderQueueRow[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [active, setActive] = useState<ProviderQueueRow | null>(null);

  const rows = useMemo(() => {
    if (tab === 'all') return providers;
    return providers.filter((p) => p.status === tab);
  }, [tab, providers]);

  const counts = useMemo(() => {
    return {
      all: providers.length,
      pending: providers.filter((p) => p.status === 'pending').length,
      verified: providers.filter((p) => p.status === 'verified').length,
      suspended: providers.filter((p) => p.status === 'suspended').length,
    } as Record<Tab, number>;
  }, [providers]);

  return (
    <>
      <PageHeader
        eyebrow="the queue"
        title="Providers"
        description="Verification queue, background-check status, and provider lifecycle controls."
      />

      <div className="mb-4 flex items-center gap-1 border-b border-divider">
        {TABS.map((t) => {
          const sel = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                sel
                  ? 'border-amber-500 text-primary-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              )}
            >
              {t.label}{' '}
              <span className={cn('ml-1 text-xs', sel ? 'text-primary-600' : 'text-ink-400')}>
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-divider/50 text-ink-500 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <Th>Business</Th>
              <Th>Owner</Th>
              <Th>Email</Th>
              <Th>Tier</Th>
              <Th>Status</Th>
              <Th>Submitted</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                onClick={() => setActive(p)}
                className="border-t border-divider hover:bg-divider/30 cursor-pointer transition-colors"
              >
                <Td className="font-semibold text-ink-900">{p.businessName}</Td>
                <Td>{p.ownerName}</Td>
                <Td className="text-ink-400 text-xs">{p.email}</Td>
                <Td>
                  <span className="font-display font-bold text-ink-900">
                    {p.tier === 0 ? '—' : `T${p.tier}`}
                  </span>
                </Td>
                <Td>
                  <Pill tone={STATUS_TONE[p.status]}>
                    {p.status.replace('_', ' ')}
                  </Pill>
                </Td>
                <Td className="text-ink-400 text-xs italic">
                  {formatDistanceToNow(new Date(p.submittedAt), { addSuffix: true })}
                </Td>
                <Td>
                  <ChevronRight size={15} className="text-ink-300" />
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-ink-400 text-sm italic">
                  No providers in this bucket.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!active} title="Provider details" onClose={() => setActive(null)} width={520}>
        {active ? <ProviderDrawerBody p={active} /> : null}
      </Drawer>
    </>
  );
}

function ProviderDrawerBody({ p }: { p: ProviderQueueRow }) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-500 italic mb-1">
          the provider
        </p>
        <h3 className="font-display font-bold text-xl text-ink-900 tracking-tight">{p.businessName}</h3>
        <p className="text-sm text-ink-500 italic mt-0.5">
          {p.ownerName} · {p.email}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Pill tone={STATUS_TONE[p.status]}>{p.status.replace('_', ' ')}</Pill>
          {p.tier > 0 ? (
            <Pill tone={p.tier === 2 ? 'warning' : 'success'}>
              {p.tier === 2 ? (
                <>
                  <ShieldAlert size={12} /> Tier 2 · insured
                </>
              ) : (
                <>
                  <ShieldCheck size={12} /> Tier 1 · background-checked
                </>
              )}
            </Pill>
          ) : null}
        </div>
      </section>

      <section>
        <DrawerSectionTitle>Services offered</DrawerSectionTitle>
        <p className="text-sm text-ink-700">
          {p.serviceTypes.length ? p.serviceTypes.join(', ') : '—'}
        </p>
        <p className="text-[11px] italic text-ink-400 mt-1">
          Created {format(new Date(p.submittedAt), "MMM d, yyyy 'at' h:mm a")}
        </p>
      </section>

      <DrawerActions providerId={p.id} />
    </div>
  );
}

function DrawerActions({ providerId }: { providerId: string }) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const apply = (tier: 0 | 1 | 2) => {
    setFeedback(null);
    start(async () => {
      const res = await overrideVerificationTier(providerId, tier);
      if (res.error) setFeedback({ ok: false, msg: res.error });
      else setFeedback({ ok: true, msg: tier === 0 ? 'Reset to unverified.' : `Approved at Tier ${tier}.` });
    });
  };

  return (
    <section className="border-t border-divider pt-5 space-y-2">
      <DrawerSectionTitle>Actions</DrawerSectionTitle>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" size="sm" disabled={pending} onClick={() => apply(1)}>
          Approve Tier 1
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => apply(2)}>
          Approve Tier 2
        </Button>
        <Button variant="outline" size="sm" disabled={pending}>
          <Mail size={14} /> Request more info
        </Button>
        <Button variant="destructive" size="sm" disabled={pending} onClick={() => apply(0)}>
          Reset
        </Button>
      </div>
      {feedback ? (
        <p className={cn('text-xs italic', feedback.ok ? 'text-success' : 'text-error')}>
          {feedback.msg}
        </p>
      ) : null}
    </section>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 text-left">{children}</th>;
}
function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('px-4 py-2.5 text-sm text-ink-700', className)}>{children}</td>;
}
function DrawerSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-2">
      {children}
    </h4>
  );
}
