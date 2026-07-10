import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';

const containerVariants = cva('w-full mx-auto px-4 lg:px-6', {
  variants: {
    width: {
      fixed: 'max-w-[1320px]',
      fluid: '',
    },
  },
  defaultVariants: {
    width: 'fixed',
  },
});

export function Container({ children, width, className = '' }) {
  const { settings } = useSettings();
  const effectiveWidth = width ?? settings.container ?? 'fixed';

  return (
    <div
      data-slot="container"
      className={cn(containerVariants({ width: effectiveWidth }), className)}
    >
      {children}
    </div>
  );
}
