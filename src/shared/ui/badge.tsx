import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-studio-navy focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-studio-navy text-white',
        secondary: 'border-transparent bg-slate-100 text-studio-navy',
        destructive: 'border-transparent bg-rose-500 text-white',
        outline: 'text-studio-navy border-slate-200',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
        info: 'border-blue-200 bg-blue-50 text-blue-800',
        // Colores de cinturón (sistema de graduación, parte de la identidad)
        bjjBlue: 'border-blue-300 bg-blue-600 text-white',
        bjjPurple: 'border-purple-300 bg-purple-600 text-white',
        bjjBrown: 'border-amber-800 bg-amber-900 text-white',
        studio: 'border-studio-red/30 bg-rose-50 text-studio-red font-black',
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

