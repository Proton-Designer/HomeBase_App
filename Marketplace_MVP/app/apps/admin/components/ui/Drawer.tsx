'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Drawer({
  open,
  title,
  children,
  onClose,
  width = 480,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity z-40',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed top-0 right-0 h-full bg-white shadow-lg z-50 transition-transform border-l border-border flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-divider">
          <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-divider rounded-md">
            <X size={20} className="text-ink-500" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </>
  );
}
