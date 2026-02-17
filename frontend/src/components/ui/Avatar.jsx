// src/components/ui/Avatar.jsx
import React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex w-8 h-8 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cn('w-full h-full', className)} {...props} />
  );
}

export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('bg-muted flex w-full h-full items-center justify-center rounded-full', className)}
      {...props}
    />
  );
}
