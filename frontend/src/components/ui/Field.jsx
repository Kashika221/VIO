import React, { useMemo } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Label } from './Label';
import { Separator } from './Separator';

export function FieldSet({ className, ...props }) {
  return <fieldset data-slot="field-set" className={cn('flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3', className)} {...props} />;
}

export function FieldLegend({ className, variant = 'legend', ...props }) {
  return <legend data-slot="field-legend" data-variant={variant} className={cn('mb-3 font-medium', className)} {...props} />;
}

export function FieldGroup({ className, ...props }) {
  return <div data-slot="field-group" className={cn('group/field-group flex w-full flex-col gap-7', className)} {...props} />;
}

const fieldVariants = cva('group/field flex w-full gap-3 data-[invalid=true]:text-destructive', {
  variants: { orientation: { vertical: 'flex-col [&>*]:w-full', horizontal: 'flex-row items-center' } },
  defaultVariants: { orientation: 'vertical' },
});

export function Field({ className, orientation = 'vertical', ...props }) {
  return <div role="group" data-slot="field" data-orientation={orientation} className={cn(fieldVariants({ orientation }), className)} {...props} />;
}

export function FieldContent({ className, ...props }) {
  return <div data-slot="field-content" className={cn('flex flex-1 flex-col gap-1.5 leading-snug', className)} {...props} />;
}

export function FieldLabel({ className, ...props }) {
  return <Label data-slot="field-label" className={cn('flex w-fit gap-2 leading-snug', className)} {...props} />;
}

export function FieldTitle({ className, ...props }) {
  return <div data-slot="field-label" className={cn('flex w-fit items-center gap-2 text-sm leading-snug font-medium', className)} {...props} />;
}

export function FieldDescription({ className, ...props }) {
  return <p data-slot="field-description" className={cn('text-muted-foreground text-sm leading-normal', className)} {...props} />;
}

export function FieldSeparator({ children, className, ...props }) {
  return (
    <div data-slot="field-separator" data-content={!!children} className={cn('relative -my-2 h-5 text-sm', className)} {...props}>
      <Separator className="absolute inset-0 top-1/2" />
      {children && <span className="bg-background text-muted-foreground relative mx-auto block w-fit px-2">{children}</span>}
    </div>
  );
}

export function FieldError({ className, children, errors, ...props }) {
  const content = useMemo(() => {
    if (children) return children;
    if (!errors) return null;
    if (errors.length === 1 && errors[0]?.message) return errors[0].message;
    return <ul className="ml-4 flex list-disc flex-col gap-1">{errors.map((e, i) => e?.message && <li key={i}>{e.message}</li>)}</ul>;
  }, [children, errors]);

  if (!content) return null;

  return <div role="alert" data-slot="field-error" className={cn('text-destructive text-sm font-normal', className)} {...props}>{content}</div>;
}
