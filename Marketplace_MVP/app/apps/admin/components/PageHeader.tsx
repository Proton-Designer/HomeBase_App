import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 mb-6">
      <div>
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-widest font-semibold italic text-amber-500 mb-1">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[26px] font-bold text-ink-900 tracking-tight leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm italic text-ink-400 mt-1 leading-snug">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2 mt-1">{actions}</div> : null}
    </header>
  );
}
