import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        destructive: 'border-transparent bg-rose-500 text-white',
        studio: 'border-transparent bg-brand-accent text-white shadow-xs',
        outline: 'text-slate-950 border-slate-200',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        gold: 'border-amber-400 bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-950 shadow-xs font-black',
        iconBlack: 'border-slate-800 bg-slate-950 text-amber-400 shadow-xs font-black',
        bjjBlue: 'border-blue-300 bg-blue-600 text-white',
        bjjPurple: 'border-purple-300 bg-purple-600 text-white',
        bjjBrown: 'border-amber-800 bg-amber-900 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
