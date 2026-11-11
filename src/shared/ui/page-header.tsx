import * as React from 'react';

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/** Page title block used by admin pages: big condensed title on the left, actions on the right. */
export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => (
  <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between xl:gap-6">
    <div className="min-w-0">
      <h1 className="font-headline text-3xl md:text-4xl uppercase leading-none tracking-tight text-studio-navy">
        {title}
      </h1>
      {description && <p className="mt-1.5 text-sm font-medium text-slate-600">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
  </header>
);
