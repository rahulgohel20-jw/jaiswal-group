'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useMotionValue } from 'motion/react';
import { cn } from '@/lib/utils';

export function CountingNumber({
  from = 0,
  to = 100,
  duration = 2,
  delay = 0,
  className,
  startOnView = true,
  once = false,
  inViewMargin,
  onComplete,
  format,
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [display, setDisplay] = useState(from);
  const motionValue = useMotionValue(from);

  // Should start animation?
  const shouldStart = !startOnView || (isInView && (!once || !hasAnimated));

  useEffect(() => {
    if (!shouldStart) return;
    setHasAnimated(true);
    const timeout = setTimeout(() => {
      const controls = animate(motionValue, to, {
        duration,
        onUpdate: (v) => setDisplay(v),
        onComplete,
      });
      return () => controls.stop();
    }, delay);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldStart, from, to, duration, delay]);

  return (
    <motion.span ref={ref} className={cn('inline-block', className)} {...props}>
      {format ? format(display) : Math.round(display)}
    </motion.span>
  );
}
