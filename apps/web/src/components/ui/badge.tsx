import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-gray-700 bg-gray-800 text-gray-300',
        destructive: 'border-transparent bg-red-600 text-white',
        warning: 'border-transparent bg-orange-600 text-white',
        caution: 'border-transparent bg-yellow-600 text-white',
        outline: 'border-gray-700 text-gray-400',
        store: 'border-gray-700/50 bg-gray-800/60 text-gray-500',
        category: 'border-transparent bg-blue-900/50 text-blue-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
