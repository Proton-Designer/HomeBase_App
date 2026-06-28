'use client';

import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ChevronRight, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { type AdminUser, type AdminUserRole } from '@/lib/admin-types';
import { cn } from '@/lib/cn';

const ROLE_LABEL: Record<AdminUserRole, string> = {
  homeowner: 'Homeowner',
  provider_owner: 'Provider · Owner',
  provider_tech: 'Provider · Tech',
};

type Filter = 'all' | AdminUserRole;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'homeowner', label: 'Homeowners' },
  { id: 'provider_owner', label: 'Providers' },
  { id: 'provider_tech', label: 'Techs' },
];

export function UsersClient({ users }: { users: AdminUser[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<AdminUser | null>(null);

  const rows = useMemo(() => {
    if (filter === 'all') return users;
    return users.filter((u) => u.role === filter);
  }, [filter, users]);

  return (
    <>
      <PageHeader
        eyebrow="the roster"
        title="Users"
        description="Homeowners, provider owners, and crew techs. Reset password from the drawer."
      />

      <div className="mb-4 flex items-center gap-1 border-b border-divider">
        {FILTERS.map((f) => {
          const sel = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                sel
                  ? 'border-amber-500 text-primary-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-divider/50 text-ink-500 text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Joined</Th>
              <Th>Last active</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr
                key={u.id}
                onClick={() => setActive(u)}
                className="border-t border-divider hover:bg-divider/30 cursor-pointer transition-colors"
              >
                <Td className="font-semibold text-ink-900">{u.name}</Td>
                <Td className="text-ink-400 text-xs">{u.email}</Td>
                <Td>{ROLE_LABEL[u.role]}</Td>
                <Td className="text-ink-400 text-xs">
                  {format(new Date(u.joinedAt), 'MMM d, yyyy')}
                </Td>
                <Td className="text-ink-400 text-xs italic">
                  {formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })}
                </Td>
                <Td>
                  <ChevronRight size={15} className="text-ink-300" />
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-ink-400 text-sm italic">
                  No users in this view.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Drawer open={!!active} title="User detail" onClose={() => setActive(null)} width={460}>
        {active ? <UserDrawerBody u={active} /> : null}
      </Drawer>
    </>
  );
}

function UserDrawerBody({ u }: { u: AdminUser }) {
  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-1">
          the user
        </p>
        <h3 className="font-display font-bold text-xl text-ink-900 tracking-tight">{u.name}</h3>
        <p className="text-sm italic text-ink-400 mt-0.5">{u.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <Pill tone="primary">{ROLE_LABEL[u.role]}</Pill>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Joined" value={format(new Date(u.joinedAt), 'MMM d, yyyy')} />
        <Stat label="Last active" value={formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })} />
      </section>

      <section className="border-t border-divider pt-4">
        <DrawerSectionTitle>Actions</DrawerSectionTitle>
        <div className="grid grid-cols-1 gap-2">
          <Button variant="outline" size="sm">
            <KeyRound size={14} /> Reset password (sends email)
          </Button>
        </div>
      </section>

      <section>
        <DrawerSectionTitle>Activity</DrawerSectionTitle>
        <p className="text-sm italic text-ink-400">
          Job history and bookings appear here once the Supabase queries are wired (§8).
        </p>
      </section>
    </div>
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
