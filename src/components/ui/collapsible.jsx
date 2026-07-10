'use client';

import React from 'react';
import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';

function Collapsible({ ...props }) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({ ...props }) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({ className, children, ...props }) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className,
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.CollapsibleContent>
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
