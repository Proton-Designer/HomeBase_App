'use client';

import { useMemo, useState, useTransition, useRef, useOptimistic } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Pencil, Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { type TrustScoreRow } from '@/lib/admin-types';
import { overrideVerificationTier } from '@/lib/actions';
import { overrideTrustScore, listOverrideHistory, type OverrideHistoryRow } from '@/lib/actions/trust-scores';
import { cn } from '@/lib/cn';

const COMPONENTS = [
  { key: 'reliability' as const, label: 'Reliability', weight: 0.35 },
  { key: 'quality' as const, label: 'Quality', weight: 0.35 },
  { key: 'communication' as const, label: 'Communication', weight: 0.2 },
  { key: 'professionalism' as const, label: 'Professionalism', weight: 0.1 },
];

function computeOverall(vals: Record<string, number>): number {
  return COMPONENTS.reduce((sum, c) => sum + (vals[c.key] ?? 0) * c.weight, 0);
}

function overallTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 4) return 'success';
  if (score >= 3) return 'warning';
  return 'error';
}

function componentTone(score: number): 'success' | 'warning' | 'error' {
  if (score >= 4.5) return 'success';
  if (score >= 3.5) return 'warning';
  return 'error';
}

// ---- main table ------------------------------------------------------------

export function TrustScoresClient({ trustScores }: { trustScores: TrustScoreRow[] }) {
  const [active, setActive] = useState<TrustScoreRow | null>(null);
  const [optimisticRows, updateOptimistic] = useOptimistic(
    trustScores,
    (prev, update: TrustScoreRow) => prev.map((r) => (r.providerId === update.providerId ? update : r))
  );

  const rows = useMemo(() => optimisticRows, [optimisticRows]);

  function handleOverrideSuccess(updated: TrustScoreRow) {
    updateOptimistic(updated);
    setActive(updated);
  }

  return (
    <>
      <PageHeader
        eyebrow="the scores"
        title="Trust score overrides"
        description="Rolled-up composite scores from completed jobs. Override individual components with a required reason — logged to audit trail."
      />

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-divider/50 text-ink-500 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <Th>Provider</Th>
              {COMPONENTS.map((c) => (
                <Th key={c.key}>{c.label}</Th>
              ))}
              <Th>Overall</Th>
              <Th>Check-ins</Th>
              <Th>Last updated</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.providerId}
                onClick={() => setActive(r)}
                className="border-t border-divider hover:bg-divider/30 cursor-pointer transition-colors"
              >
                <Td className="font-semibold text-ink-900">{r.providerName}</Td>
                {COMPONENTS.map((c) => (
                  <Td key={c.key}>
                    <Pill tone={componentTone(r[c.key])}>{r[c.key].toFixed(1)}</Pill>
                  </Td>
                ))}
                <Td>
                  <span className="font-display font-bold text-ink-900">{r.overall.toFixed(2)}</span>
                </Td>
                <Td className="text-ink-500 text-xs font-mono">{r.checkInCount}</Td>
                <Td className="text-ink-400 text-xs italic">
                  {formatDistanceToNow(new Date(r.lastUpdated), { addSuffix: true })}
                </Td>
                <Td>
                  <ChevronRight size={15} className="text-ink-300" />
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-ink-400 text-sm italic">
                  No providers with trust scores yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!active} title="Trust score detail" onClose={() => setActive(null)} width={580}>
        {active ? (
          <TrustDrawerBody
            row={active}
            onOptimisticUpdate={handleOverrideSuccess}
          />
        ) : null}
      </Drawer>
    </>
  );
}

// ---- drawer body -----------------------------------------------------------

function TrustDrawerBody({
  row,
  onOptimisticUpdate,
}: {
  row: TrustScoreRow;
  onOptimisticUpdate: (updated: TrustScoreRow) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [history, setHistory] = useState<OverrideHistoryRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);
  const [tierSuccess, setTierSuccess] = useState(false);

  // Score inputs for live preview
  const [draftScores, setDraftScores] = useState({
    reliability: row.reliability,
    quality: row.quality,
    communication: row.communication,
    professionalism: row.professionalism,
  });
  const formRef = useRef<HTMLFormElement>(null);

  const liveOverall = computeOverall(draftScores);

  function handleOpenOverride() {
    setDraftScores({
      reliability: row.reliability,
      quality: row.quality,
      communication: row.communication,
      professionalism: row.professionalism,
    });
    setOverrideError(null);
    setOverrideSuccess(false);
    setShowOverrideForm(true);

    // Load history lazily
    if (history === null) {
      setHistoryLoading(true);
      startTransition(async () => {
        const rows = await listOverrideHistory(row.providerId);
        setHistory(rows);
        setHistoryLoading(false);
      });
    }
  }

  function handleScoreInput(key: keyof typeof draftScores, value: string) {
    const n = parseFloat(value);
    setDraftScores((prev) => ({ ...prev, [key]: isNaN(n) ? 0 : n }));
  }

  function handleSubmitOverride(formData: FormData) {
    setOverrideError(null);
    setOverrideSuccess(false);

    // Optimistic row update
    const updatedRow: TrustScoreRow = {
      ...row,
      reliability: draftScores.reliability,
      quality: draftScores.quality,
      communication: draftScores.communication,
      professionalism: draftScores.professionalism,
      overall: Math.round(liveOverall * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };

    startTransition(async () => {
      const result = await overrideTrustScore(formData);
      if (result.error) {
        setOverrideError(result.error);
      } else {
        setOverrideSuccess(true);
        setShowOverrideForm(false);
        onOptimisticUpdate(updatedRow);
        // Refresh history
        const refreshed = await listOverrideHistory(row.providerId);
        setHistory(refreshed);
      }
    });
  }

  function handleTierOverride(tier: 0 | 1 | 2) {
    setTierError(null);
    setTierSuccess(false);
    startTransition(async () => {
      const result = await overrideVerificationTier(row.providerId, tier);
      if (result.error) setTierError(result.error);
      else setTierSuccess(true);
    });
  }

  return (
    <div className="space-y-5">
      {/* Provider meta */}
      <section>
        <p className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-1">
          the provider
        </p>
        <h3 className="font-display font-bold text-xl text-ink-900 tracking-tight">{row.providerName}</h3>
        <p className="text-xs italic text-ink-400 font-mono mt-0.5">{row.providerId}</p>
        <p className="text-xs italic text-ink-400 mt-1">
          {row.checkInCount} completed check-ins · last update{' '}
          {formatDistanceToNow(new Date(row.lastUpdated), { addSuffix: true })}
        </p>

        {/* Score grid */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {COMPONENTS.map((c) => (
            <div key={c.key} className="bg-divider/40 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-widest font-semibold italic text-ink-400">
                {c.label} · {(c.weight * 100).toFixed(0)}%
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-display font-bold text-2xl text-ink-900">
                  {row[c.key].toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Override scores button */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenOverride}
            title="Changes are logged to the audit trail"
          >
            <Pencil size={13} />
            Override scores
          </Button>
          <span className="text-[10px] italic text-ink-400 flex items-center gap-1">
            <Info size={11} />
            Logged to audit trail
          </span>
        </div>

        {overrideSuccess ? (
          <p className="text-xs text-green-600 italic mt-2">Scores updated — table reflects new values.</p>
        ) : null}
      </section>

      {/* Score override form */}
      {showOverrideForm ? (
        <section className="border border-divider rounded-xl p-4 space-y-4 bg-divider/20">
          <DrawerSectionTitle>Override component scores</DrawerSectionTitle>

          {/* Live overall pill */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500 font-semibold">Computed overall:</span>
            <Pill tone={overallTone(liveOverall)} className="font-mono font-bold">
              {liveOverall.toFixed(2)}
            </Pill>
          </div>

          <form
            ref={formRef}
            action={handleSubmitOverride}
            className="space-y-3"
          >
            <input type="hidden" name="providerId" value={row.providerId} />

            <div className="grid grid-cols-2 gap-3">
              {COMPONENTS.map((c) => (
                <label key={c.key} className="block">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-ink-500">
                    {c.label}
                  </span>
                  <input
                    type="number"
                    name={c.key}
                    min={0}
                    max={5}
                    step={0.1}
                    value={draftScores[c.key]}
                    onChange={(e) => handleScoreInput(c.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-divider bg-white px-3 py-1.5 text-sm font-mono text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-600/40"
                    required
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-ink-500">
                Reason (required, min 10 chars)
              </span>
              <textarea
                name="reason"
                minLength={10}
                required
                rows={3}
                placeholder="Describe why you're overriding these scores..."
                className="mt-1 w-full rounded-lg border border-divider bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-primary-600/40 resize-none"
              />
            </label>

            <p className="text-[10px] italic text-amber-600 flex items-center gap-1">
              <Info size={11} />
              Note: composite scores recompute from check-ins nightly. An override holds for ~24 hours.
            </p>

            {overrideError ? (
              <p className="text-xs text-error italic">{overrideError}</p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button variant="primary" size="sm" type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save override'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowOverrideForm(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Override history */}
      {showOverrideForm || history !== null ? (
        <section className="border-t border-divider pt-4">
          <DrawerSectionTitle>Override history</DrawerSectionTitle>
          {historyLoading ? (
            <p className="text-xs italic text-ink-400">Loading…</p>
          ) : history && history.length > 0 ? (
            <ol className="space-y-3">
              {history.map((h) => (
                <HistoryRow key={h.id} row={h} />
              ))}
            </ol>
          ) : (
            <p className="text-xs italic text-ink-400">No overrides recorded yet.</p>
          )}
        </section>
      ) : null}

      {/* Verification tier override */}
      <section className="border-t border-divider pt-4 space-y-2">
        <DrawerSectionTitle>Verification tier override</DrawerSectionTitle>
        {tierError ? <p className="text-xs text-error italic">{tierError}</p> : null}
        {tierSuccess ? (
          <p className="text-xs text-green-600 italic">Tier updated — table will refresh on next load.</p>
        ) : null}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleTierOverride(0)}>
            Set Tier 0
          </Button>
          <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleTierOverride(1)}>
            Set Tier 1
          </Button>
          <Button variant="primary" size="sm" disabled={isPending} onClick={() => handleTierOverride(2)}>
            Set Tier 2
          </Button>
        </div>
      </section>
    </div>
  );
}

// ---- history row -----------------------------------------------------------

function HistoryRow({ row }: { row: OverrideHistoryRow }) {
  const [expanded, setExpanded] = useState(false);
  const prev = row.prevScores;
  const next = row.newScores;

  return (
    <li className="text-xs border border-divider rounded-lg p-3 space-y-1.5 bg-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-ink-700">{row.adminEmail ?? 'admin'}</span>
        <span className="text-ink-400 italic">
          {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Per-component prev → new */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1">
        {COMPONENTS.map((c) => {
          const p = (prev[c.key] ?? 0).toFixed(1);
          const n = (next[c.key] ?? 0).toFixed(1);
          const changed = p !== n;
          return (
            <div key={c.key} className={cn('flex items-center gap-1', changed ? 'text-ink-900' : 'text-ink-400')}>
              <span className="w-[90px] truncate">{c.label}</span>
              <span className="font-mono">{p}</span>
              <span className="text-ink-300">→</span>
              <span className={cn('font-mono font-semibold', changed ? (Number(n) > Number(p) ? 'text-green-600' : 'text-error') : '')}>
                {n}
              </span>
            </div>
          );
        })}
      </div>

      {/* Reason with truncation */}
      <div>
        <span className="text-ink-500">Reason: </span>
        {!expanded && row.reason.length > 80 ? (
          <>
            <span className="text-ink-700">{row.reason.slice(0, 80)}… </span>
            <button className="text-primary-600 underline" onClick={() => setExpanded(true)}>
              Show more
            </button>
          </>
        ) : (
          <span className="text-ink-700">{row.reason}</span>
        )}
      </div>
    </li>
  );
}

// ---- helpers ---------------------------------------------------------------

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
