import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'bg-surface rounded-xl border border-border shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
