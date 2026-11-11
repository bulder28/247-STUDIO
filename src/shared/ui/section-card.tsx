import * as React from 'react';
import { cn } from '@/shared/lib/utils';

interface SectionCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Remove the body padding so lists and tables can run edge to edge. */
  flush?: boolean;
}

/** White working surface with an optional header row (title, description, actions). */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  actions,
  flush = false,
  className,
  children,
  ...rest
}) => (
  <section
    className={cn('overflow-hidden rounded-2xl border border-studio-navy/10 bg-white', className)}
    {...rest}
  >
    {(title || actions) && (
      <div className="flex flex-col gap-3 border-b border-studio-navy/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title && <h2 className="text-lg font-bold leading-tight text-studio-navy">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={flush ? '' : 'p-5'}>{children}</div>
  </section>
);
