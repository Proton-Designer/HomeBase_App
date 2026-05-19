'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Users,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { signOutAction } from '@/app/sign-in/actions';

const NAV = [
  {
    href: '/admin/providers',
    label: 'Providers',
    Icon: Briefcase,
    caption: 'weekly queue: 14',
  },
  {
    href: '/admin/jobs',
    label: 'Jobs',
    Icon: ClipboardList,
    caption: 'weekly volume: 142',
  },
  {
    href: '/admin/claims',
    label: 'Claims',
    Icon: ShieldCheck,
    caption: 'weekly claims: 3',
  },
  {
    href: '/admin/trust-scores',
    label: 'Trust Scores',
    Icon: TrendingUp,
    caption: 'overrides pending: 0',
  },
  {
    href: '/admin/users',
    label: 'Users',
    Icon: Users,
    caption: 'active today: 28',
  },
];

interface SidebarProps {
  adminEmail?: string;
}

export function Sidebar({ adminEmail }: SidebarProps) {
  const pathname = usePathname();
  const initial = adminEmail ? adminEmail[0].toUpperCase() : 'A';

  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col">
      {/* Wordmark */}
      <div className="px-5 py-6 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-sm">H</span>
        </div>
        <div>
          <div className="font-display font-bold text-ink-900 leading-none tracking-tight">HomeBase</div>
          <div className="text-[10px] text-ink-400 mt-0.5 italic">Admin · ops</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV.map((n) => {
          const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-ink-600 hover:bg-divider hover:text-ink-900'
              )}
            >
              {active && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-amber-400" />
              )}
              <n.Icon
                size={15}
                className={cn('mt-0.5 shrink-0', active ? 'text-primary-600' : 'text-ink-400')}
              />
              <div className="flex flex-col min-w-0">
                <span className={cn('leading-snug', active && 'font-semibold')}>{n.label}</span>
                {active && (
                  <span className="text-[10px] italic text-ink-400 font-normal mt-0.5 leading-none">
                    {n.caption}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-divider">
        <div className="px-3 py-2 flex items-center gap-2.5 text-xs text-ink-500">
          <div className="w-7 h-7 shrink-0 rounded-full bg-primary-700 flex items-center justify-center text-white font-display text-xs">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-ink-900 truncate leading-snug">Admin</div>
            <div className="truncate text-[10px] italic text-ink-400">{adminEmail ?? ''}</div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="p-1 hover:bg-divider rounded-md transition-colors"
              aria-label="Sign out"
            >
              <LogOut size={13} className="text-ink-400" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
