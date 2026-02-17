'use client'

import * as React from 'react'
import { Drawer as DrawerPrimitive } from 'vaul'
import { cn } from '@/lib/utils'

function Drawer(props) {
  return <DrawerPrimitive.Root {...props} />
}

function DrawerTrigger(props) {
  return <DrawerPrimitive.Trigger {...props} />
}

function DrawerPortal(props) {
  return <DrawerPrimitive.Portal {...props} />
}

function DrawerClose(props) {
  return <DrawerPrimitive.Close {...props} />
}

function DrawerOverlay({ className, ...props }) {
  return (
    <DrawerPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({ className, children, ...props }) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 h-1.5 w-[100px] rounded-full bg-border" />
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        'grid gap-1.5 px-4 text-center sm:text-left',
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-col-reverse gap-2 px-4 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function DrawerTitle({ className, ...props }) {
  return (
    <DrawerPrimitive.Title
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({ className, ...props }) {
  return (
    <DrawerPrimitive.Description
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
