import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export type KpiTone = 'neutral' | 'warning' | 'danger' | 'success';

const valueTone: Record<KpiTone, string> = {
  neutral: 'text-white',
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  danger: 'text-rose-300',
};

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: KpiTone;
  /** Larger numeral for the lead figure. */
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Figure tile meant to sit inside a dark panel. Renders as a button when `onClick` is
 * provided so a tile can act as a shortcut to the list it summarises.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  hint,
  tone = 'neutral',
  featured = false,
  onClick,
  className,
}) => {
  const body = (
    <>
      <span className="block text-xs font-semibold uppercase tracking-wider text-white/70">{label}</span>
      <span
        className={cn(
          'mt-1.5 block font-headline font-bold leading-none tabular-nums',
          featured ? 'text-5xl' : 'text-4xl',
          valueTone[tone]
        )}
      >
        {value}
      </span>
      {hint && <span className="mt-2 block text-xs font-medium text-white/65">{hint}</span>}
    </>
  );

  const base = cn('block min-w-0 rounded-xl px-4 py-3.5 text-left', className);

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          base,
          'min-h-11 cursor-pointer transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70'
        )}
      >
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
};
