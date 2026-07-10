'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'font-medium',
        secondary: 'font-normal',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

function Label({ className, variant, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(labelVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Label };
