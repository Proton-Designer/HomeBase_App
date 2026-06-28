'use client';

import { useMemo, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronRight, Radio } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Drawer } from '@/components/ui/Drawer';
import { type AdminJob, type AdminJobStatus } from '@/lib/admin-types';
import { cn } from '@/lib/cn';

const STATUS_TONE: Record<AdminJobStatus, 'neutral' | 'success' | 'warning' | 'info' | 'error'> = {
  booked: 'neutral',
  confirmed: 'success',
  en_route: 'warning',
  in_progress: 'info',
  completed: 'neutral',
  cancelled: 'error',
};

const STATUS_LABEL: Record<AdminJobStatus, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  en_route: 'En route',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const VALID_STATUSES: AdminJobStatus[] = [
  'booked', 'confirmed', 'en_route', 'in_progress', 'completed', 'cancelled',
];

function normaliseStatus(raw: string): AdminJobStatus {
  return VALID_STATUSES.includes(raw as AdminJobStatus) ? (raw as AdminJobStatus) : 'booked';
}

export function JobsClient({
  initialJobs,
  supabaseUrl,
  supabaseAnonKey,
}: {
  initialJobs: AdminJob[];
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [jobs, setJobs] = useState<AdminJob[]>(initialJobs);
  const [service, setService] = useState<'' | 'lawn' | 'cleaning'>('');
  const [status, setStatus] = useState<'' | AdminJobStatus>('');
  const [provider, setProvider] = useState('');
  const [active, setActive] = useState<AdminJob | null>(null);

  useEffect(() => {
    const client = createClient(supabaseUrl, supabaseAnonKey);

    const channel = client
      .channel('admin-jobs-board')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'jobs' },
        (payload) => {
          const incoming = payload.new as Record<string, unknown> | undefined;
          const oldRecord = payload.old as Record<string, unknown> | undefined;

          if (payload.eventType === 'DELETE' && oldRecord?.id) {
            setJobs((prev) => prev.filter((j) => j.id !== oldRecord.id));
            return;
          }

          if (!incoming?.id) return;

          const timestamps = incoming.timestamps as Record<string, unknown> | null;
          const updated: AdminJob = {
            id: incoming.id as string,
            homeowner: '—',
            homeownerEmail: '',
            providerName: '—',
            service: (incoming.service_type === 'cleaning' ? 'cleaning' : 'lawn') as 'lawn' | 'cleaning',
            scheduledAt: (incoming.scheduled_at as string) ?? new Date().toISOString(),
            status: normaliseStatus((incoming.status as string) ?? 'booked'),
            amountCents: (incoming.amount_cents as number) ?? 0,
            createdAt: (incoming.created_at as string) ?? new Date().toISOString(),
            checkInSubmitted: !!(timestamps && typeof timestamps === 'object' && 'completed' in timestamps),
          };

          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === updated.id);
            if (idx === -1) return [updated, ...prev];
            const next = [...prev];
            next[idx] = updated;
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [supabaseUrl, supabaseAnonKey]);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (service && j.service !== service) return false;
      if (status && j.status !== status) return false;
      if (provider && !j.providerName.toLowerCase().includes(provider.toLowerCase())) return false;
      return true;
    });
  }, [jobs, service, status, provider]);

  return (
    <>
      <PageHeader
        eyebrow="the board"
        title="Jobs"
        description="Live jobs board with Supabase Realtime."
        actions={
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 italic">
            <Radio size={11} className="animate-pulse" /> Live
          </span>
        }
      />

      <Card className="p-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <Select value={service} onChange={(v) => setService(v as '' | 'lawn' | 'cleaning')} options={[
            { v: '', label: 'All services' },
            { v: 'lawn', label: 'Lawn' },
            { v: 'cleaning', label: 'Cleaning' },
          ]} />
          <Select value={status} onChange={(v) => setStatus(v as AdminJobStatus | '')} options={[
            { v: '', label: 'All statuses' },
            { v: 'booked', label: 'Booked' },
            { v: 'confirmed', label: 'Confirmed' },
            { v: 'en_route', label: 'En route' },
            { v: 'in_progress', label: 'In progress' },
            { v: 'completed', label: 'Completed' },
            { v: 'cancelled', label: 'Cancelled' },
          ]} />
          <input
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="Provider name"
            className="px-3 py-1.5 rounded-md border border-border text-sm flex-1 min-w-[200px] bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-divider/50 text-ink-500 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <Th>Job ID</Th>
              <Th>Homeowner</Th>
              <Th>Provider</Th>
              <Th>Service</Th>
              <Th>Scheduled</Th>
              <Th>Status</Th>
              <Th>Amount</Th>
              <Th>Created</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((j) => (
              <tr
                key={j.id}
                onClick={() => setActive(j)}
                className="border-t border-divider hover:bg-divider/30 cursor-pointer transition-colors"
              >
                <Td className="font-mono text-[11px] text-ink-400">{j.id}</Td>
                <Td className="font-semibold text-ink-900">{j.homeowner}</Td>
                <Td>{j.providerName}</Td>
                <Td className="capitalize">{j.service}</Td>
                <Td className="text-ink-500 text-xs">{format(new Date(j.scheduledAt), "MMM d 'at' h:mm a")}</Td>
                <Td>
                  <Pill tone={STATUS_TONE[j.status]}>{STATUS_LABEL[j.status]}</Pill>
                </Td>
                <Td className="font-semibold text-ink-900">${(j.amountCents / 100).toFixed(2)}</Td>
                <Td className="text-ink-400 text-xs italic">
                  {formatDistanceToNow(new Date(j.createdAt), { addSuffix: true })}
                </Td>
                <Td>
                  <ChevronRight size={15} className="text-ink-300" />
                </Td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-ink-400 text-sm italic">
                  No jobs match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!active} title="Job detail" onClose={() => setActive(null)} width={540}>
        {active ? <JobDrawerBody job={active} /> : null}
      </Drawer>
    </>
  );
}

function JobDrawerBody({ job }: { job: AdminJob }) {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-1">
          the job
        </p>
        <p className="font-mono text-[11px] text-ink-400">{job.id}</p>
        <h3 className="font-display font-bold text-xl text-ink-900 mt-1 capitalize tracking-tight">
          {job.service} · {job.homeowner} ↔ {job.providerName}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <Pill tone={STATUS_TONE[job.status]}>{STATUS_LABEL[job.status]}</Pill>
          <span className="text-sm italic text-ink-400">
            {format(new Date(job.scheduledAt), "EEE, MMM d 'at' h:mm a")}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Amount" value={`$${(job.amountCents / 100).toFixed(2)}`} />
        <Stat label="Created" value={format(new Date(job.createdAt), 'MMM d, h:mm a')} />
        <Stat
          label="Check-in"
          value={job.checkInSubmitted ? 'Submitted' : 'Pending'}
        />
      </section>

    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-md border border-border text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-300"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-divider/40 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest font-semibold italic text-ink-400">
        {label}
      </div>
      <div className="font-display font-bold text-ink-900 mt-1">{value}</div>
    </div>
  );
}
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-2 text-left">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-2.5 text-sm text-ink-700', className)}>{children}</td>;
}
