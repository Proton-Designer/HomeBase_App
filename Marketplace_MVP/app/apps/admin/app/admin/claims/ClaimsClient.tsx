'use client';

import { useMemo, useState, useTransition } from 'react';
import { differenceInDays, format, formatDistanceToNow } from 'date-fns';
import { ChevronRight, AlertOctagon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { type AdminClaim, type ClaimStatus } from '@/lib/admin-types';
import {
  markUnderReview,
  approveAndRefund,
  denyClaim,
  markResolved,
} from '@/lib/actions/claims';
import { cn } from '@/lib/cn';

const TABS: { id: ClaimStatus; label: string }[] = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'denied', label: 'Denied' },
];

const STATUS_TONE: Record<ClaimStatus, 'warning' | 'info' | 'success' | 'error'> = {
  submitted: 'warning',
  under_review: 'info',
  approved: 'success',
  resolved: 'success',
  denied: 'error',
};

const STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  resolved: 'Resolved',
  denied: 'Denied',
};

export function ClaimsClient({ claims }: { claims: AdminClaim[] }) {
  const [tab, setTab] = useState<ClaimStatus>('submitted');
  const [active, setActive] = useState<AdminClaim | null>(null);
  // optimistic overrides keyed by claim id
  const [statusOverrides, setStatusOverrides] = useState<Partial<Record<string, ClaimStatus>>>({});

  const effectiveClaims = useMemo(
    () =>
      claims.map((c) =>
        statusOverrides[c.id] ? { ...c, status: statusOverrides[c.id] as ClaimStatus } : c
      ),
    [claims, statusOverrides]
  );

  const rows = useMemo(() => effectiveClaims.filter((c) => c.status === tab), [tab, effectiveClaims]);
  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t.id, effectiveClaims.filter((c) => c.status === t.id).length])
      ) as Record<ClaimStatus, number>,
    [effectiveClaims]
  );

  function handleOptimisticUpdate(claimId: string, newStatus: ClaimStatus) {
    setStatusOverrides((prev) => ({ ...prev, [claimId]: newStatus }));
    // If the drawer is showing this claim, update it too.
    setActive((prev) =>
      prev?.id === claimId ? { ...prev, status: newStatus } : prev
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="the claims"
        title="Damage claims"
        description="Review, approve, or reject homeowner claims. Approval triggers escrow release."
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
              <Th>Claim ID</Th>
              <Th>Job</Th>
              <Th>Homeowner</Th>
              <Th>Provider</Th>
              <Th>Filed</Th>
              <Th>Description</Th>
              <Th>Photos</Th>
              <Th>Amount</Th>
              <Th>SLA</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const days = differenceInDays(new Date(), new Date(c.filedAt));
              const slaRed = days >= 5 && c.status !== 'resolved' && c.status !== 'denied';
              return (
                <tr
                  key={c.id}
                  onClick={() => setActive(c)}
                  className="border-t border-divider hover:bg-divider/30 cursor-pointer transition-colors"
                >
                  <Td className="font-mono text-[11px] text-ink-400">{c.id}</Td>
                  <Td className="font-mono text-[11px] text-ink-400">{c.jobId}</Td>
                  <Td className="font-semibold text-ink-900">{c.homeowner}</Td>
                  <Td>{c.provider}</Td>
                  <Td className="text-ink-400 text-xs italic">
                    {formatDistanceToNow(new Date(c.filedAt), { addSuffix: true })}
                  </Td>
                  <Td className="max-w-xs truncate text-ink-500">{c.description}</Td>
                  <Td>{c.photos.length}</Td>
                  <Td className="font-semibold text-ink-900">${(c.amountRequestedCents / 100).toFixed(2)}</Td>
                  <Td>
                    <span className={cn('text-xs font-mono italic', slaRed ? 'text-error font-bold not-italic' : 'text-ink-400')}>
                      {days}d
                    </span>
                  </Td>
                  <Td>
                    <ChevronRight size={15} className="text-ink-300" />
                  </Td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-ink-400 text-sm italic">
                  No claims in this bucket.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!active} title="Claim detail" onClose={() => setActive(null)} width={560}>
        {active ? (
          <ClaimDrawerBody
            claim={active}
            onOptimisticUpdate={handleOptimisticUpdate}
          />
        ) : null}
      </Drawer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Drawer body
// ---------------------------------------------------------------------------

type ActionPanel = 'approve' | 'deny' | null;

function ClaimDrawerBody({
  claim,
  onOptimisticUpdate,
}: {
  claim: AdminClaim;
  onOptimisticUpdate: (claimId: string, newStatus: ClaimStatus) => void;
}) {
  const days = differenceInDays(new Date(), new Date(claim.filedAt));
  const slaRed = days >= 5 && claim.status !== 'resolved' && claim.status !== 'denied';

  const [panel, setPanel] = useState<ActionPanel>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runAction(action: (fd: FormData) => Promise<void>, fd: FormData, nextStatus: ClaimStatus) {
    setError(null);
    startTransition(async () => {
      try {
        await action(fd);
        onOptimisticUpdate(claim.id, nextStatus);
        setPanel(null);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section>
        <p className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-1">
          the claim
        </p>
        <p className="font-mono text-[11px] text-ink-400">{claim.id} · job {claim.jobId}</p>
        <h3 className="font-display font-bold text-xl text-ink-900 mt-1 tracking-tight">
          {claim.homeowner} ↔ {claim.provider}
        </h3>
        <div className="flex items-center gap-2 mt-2">
          <Pill tone={STATUS_TONE[claim.status]}>{STATUS_LABEL[claim.status]}</Pill>
          <span
            className={cn(
              'text-xs font-medium italic flex items-center gap-1',
              slaRed ? 'text-error' : 'text-ink-400'
            )}
          >
            {slaRed ? <AlertOctagon size={12} /> : null}
            SLA · {days} days since filing
          </span>
        </div>
      </section>

      {/* Description */}
      <section>
        <DrawerSectionTitle>Incident description</DrawerSectionTitle>
        <p className="text-sm text-ink-700 leading-relaxed">{claim.description}</p>
        <p className="text-[11px] italic text-ink-400 mt-2">
          Category: <span className="capitalize">{claim.incidentType.replace('_', ' ')}</span> · Requested ${(claim.amountRequestedCents / 100).toFixed(2)}
        </p>
      </section>

      {/* Photos */}
      {claim.photos.length ? (
        <section>
          <DrawerSectionTitle>Photos ({claim.photos.length})</DrawerSectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {claim.photos.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Claim photo ${i + 1}`}
                className="rounded-md w-full h-28 object-cover border border-divider"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Resolution notes (when already settled) */}
      {claim.resolutionNotes ? (
        <section>
          <DrawerSectionTitle>Resolution notes</DrawerSectionTitle>
          <p className="text-sm text-ink-700 leading-relaxed">{claim.resolutionNotes}</p>
        </section>
      ) : null}

      {/* Action area */}
      <section className="border-t border-divider pt-5">
        <DrawerSectionTitle>Resolution</DrawerSectionTitle>

        {error ? (
          <p className="mb-3 text-xs text-error bg-error/10 rounded-md px-3 py-2">{error}</p>
        ) : null}

        {/* Terminal states — no actions */}
        {claim.status === 'denied' ? (
          <p className="text-sm text-ink-500 italic">
            Denied{claim.resolvedAt ? ` · ${format(new Date(claim.resolvedAt), 'MMM d, yyyy')}` : ''}
          </p>
        ) : claim.status === 'resolved' ? (
          <p className="text-sm text-ink-500 italic">
            Resolved{claim.resolvedAt ? ` · ${format(new Date(claim.resolvedAt), 'MMM d, yyyy')}` : ''}
          </p>
        ) : claim.status === 'approved' ? (
          // approved → mark resolved
          panel === null ? (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                const fd = new FormData();
                fd.set('claimId', claim.id);
                runAction(markResolved, fd, 'resolved');
              }}
            >
              Mark resolved
            </Button>
          ) : null
        ) : (
          // submitted | under_review — show main action buttons
          panel === null ? (
            <div className="flex flex-wrap gap-2">
              {claim.status === 'submitted' ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('claimId', claim.id);
                    runAction(markUnderReview, fd, 'under_review');
                  }}
                >
                  Mark under review
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                disabled={isPending}
                onClick={() => setPanel('approve')}
              >
                Approve &amp; refund
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => setPanel('deny')}
              >
                Deny
              </Button>
            </div>
          ) : null
        )}

        {/* Approve panel */}
        {panel === 'approve' ? (
          <ApprovePanel
            claim={claim}
            isPending={isPending}
            onSubmit={(fd) => runAction(approveAndRefund, fd, 'approved')}
            onCancel={() => setPanel(null)}
          />
        ) : null}

        {/* Deny panel */}
        {panel === 'deny' ? (
          <DenyPanel
            claim={claim}
            isPending={isPending}
            onSubmit={(fd) => runAction(denyClaim, fd, 'denied')}
            onCancel={() => setPanel(null)}
          />
        ) : null}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approve & refund inline panel
// ---------------------------------------------------------------------------

function ApprovePanel({
  claim,
  isPending,
  onSubmit,
  onCancel,
}: {
  claim: AdminClaim;
  isPending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [amountCents, setAmountCents] = useState(claim.amountRequestedCents);
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountCents < 0 || amountCents > claim.amountRequestedCents) {
      setLocalError(`Amount must be between $0 and $${(claim.amountRequestedCents / 100).toFixed(2)}`);
      return;
    }
    setLocalError(null);
    const fd = new FormData();
    fd.set('claimId', claim.id);
    fd.set('refundAmountCents', String(amountCents));
    fd.set('notes', notes);
    onSubmit(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-divider bg-divider/20 p-4">
      <p className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Approve &amp; release escrow</p>

      {localError ? (
        <p className="text-xs text-error bg-error/10 rounded px-2 py-1">{localError}</p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs text-ink-500 font-medium">Refund amount (cents)</span>
        <input
          type="number"
          min={0}
          max={claim.amountRequestedCents}
          value={amountCents}
          onChange={(e) => setAmountCents(Number(e.target.value))}
          className="w-full rounded-md border border-divider bg-white px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-[11px] text-ink-400">
          ${(amountCents / 100).toFixed(2)} · requested ${(claim.amountRequestedCents / 100).toFixed(2)}
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-ink-500 font-medium">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Internal resolution notes..."
          className="w-full rounded-md border border-divider bg-white px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? 'Processing…' : 'Confirm approval'}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Deny inline panel
// ---------------------------------------------------------------------------

function DenyPanel({
  claim,
  isPending,
  onSubmit,
  onCancel,
}: {
  claim: AdminClaim;
  isPending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (notes.trim().length < 10) {
      setLocalError('Denial reason must be at least 10 characters');
      return;
    }
    setLocalError(null);
    const fd = new FormData();
    fd.set('claimId', claim.id);
    fd.set('notes', notes.trim());
    onSubmit(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-error/30 bg-error/5 p-4">
      <p className="text-xs font-semibold text-error uppercase tracking-wider">Deny claim</p>

      {localError ? (
        <p className="text-xs text-error bg-error/10 rounded px-2 py-1">{localError}</p>
      ) : null}

      <label className="block space-y-1">
        <span className="text-xs text-ink-500 font-medium">
          Denial reason <span className="text-error">*</span>
        </span>
        <textarea
          required
          minLength={10}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Explain why the claim is being denied (min 10 characters)..."
          className="w-full rounded-md border border-divider bg-white px-3 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-error/50 resize-none"
        />
        <span className="text-[11px] text-ink-400">{notes.trim().length} / 10 min</span>
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={isPending}>
          {isPending ? 'Processing…' : 'Confirm denial'}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DrawerSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-2">
      {children}
    </h4>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 text-left">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-2.5 text-sm text-ink-700', className)}>{children}</td>;
}
