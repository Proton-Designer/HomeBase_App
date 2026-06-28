import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'info' | 'error' | 'primary';

const toneClass: Record<Tone, string> = {
  neutral: 'bg-divider text-ink-700',
  success: 'bg-success-light text-success',
  warning: 'bg-accent-100 text-accent-700',
  info: 'bg-info-light text-info',
  error: 'bg-error-light text-error',
  primary: 'bg-primary-50 text-primary-600',
};

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('pill', toneClass[tone], className)}>
      {children}
    </span>
  );
}
