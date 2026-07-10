'use client';

import * as React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

function GradientBackground({
  className,
  transition = { duration: 10, ease: 'easeInOut', repeat: Infinity },
  ...props
}) {
  return (
    <motion.div
      data-slot="gradient-background"
      className={cn(
        'size-full bg-gradient-to-br from-fuchsia-400 from-0% via-50% via-violet-500 to-fuchsia-600 to-100% bg-[length:300%_300%]',
        className,
      )}
      animate={{
        backgroundPosition: [
          '0% 0%',
          '50% 50%',
          '100% 0%',
          '50% 100%',
          '0% 50%',
          '100% 100%',
          '0% 0%',
        ],
      }}
      whileTap={{
        scale: 0.98,
      }}
      transition={transition}
      {...props}
    />
  );
}

export { GradientBackground };
