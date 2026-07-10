'use client';

import { TooltipProvider } from '@/components/ui/tooltip';

export function TooltipsProvider({ children }) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
