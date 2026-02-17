// src/components/ui/Alert.jsx
import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid gap-y-0.5 items-start [&>svg]:w-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'text-destructive bg-card [&>svg]:text-current',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Alert({ className, variant, ...props }) {
  return (
    <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

export function AlertTitle({ className, ...props }) {
  return (
    <div data-slot="alert-title" className={cn('col-start-2 font-medium tracking-tight', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-muted-foreground col-start-2 text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  );
}
