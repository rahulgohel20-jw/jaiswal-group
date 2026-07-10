'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { cn } from '@/lib/utils';

const cursorVariants = {
  blinking: {
    opacity: [0, 0, 1, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      repeatDelay: 0,
      ease: 'linear',
      times: [0, 0.5, 0.5, 1],
    },
  },
};

export function TypingText({
  text,
  texts,
  speed = 100,
  delay = 0,
  showCursor = true,
  cursorClassName = '',
  cursor = '|',
  loop = false,
  pauseDuration = 2000,
  className,
  onComplete,
  startOnView = true,
  once = false,
  inViewMargin,
  ...props
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  // Determine if we should start animation
  const shouldStart = !startOnView || (isInView && (!once || !hasAnimated));

  const textArray = texts && texts.length > 0 ? texts : [text];
  const currentText = textArray[currentTextIndex] ?? '';

  useEffect(() => {
    if (!shouldStart) return;
    const timeout = setTimeout(() => {
      setIsTyping(true);
      setHasAnimated(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, shouldStart]);

  useEffect(() => {
    if (!isTyping) return;

    if (currentIndex < currentText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(currentText.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      // Typing complete
      onComplete?.();

      if (loop && texts && texts.length > 1) {
        const timeout = setTimeout(() => {
          setDisplayText('');
          setCurrentIndex(0);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }, pauseDuration);

        return () => clearTimeout(timeout);
      }
    }
  }, [
    currentIndex,
    currentText,
    isTyping,
    speed,
    loop,
    texts,
    pauseDuration,
    onComplete,
  ]);

  // Animation variants for container (fadeIn by default, extendable)
  const finalVariants = {
    container: {
      hidden: { opacity: 0, y: 10 },
      show: { opacity: 1, y: 0, transition: { staggerChildren: 0.02 } },
      exit: { opacity: 0 },
    },
  };
  const MotionComponent = motion.span;

  return (
    <MotionComponent
      ref={ref}
      variants={finalVariants.container}
      initial="hidden"
      whileInView={startOnView ? 'show' : undefined}
      animate={startOnView ? undefined : 'show'}
      exit="exit"
      className={cn('whitespace-pre-wrap', className)}
      viewport={{ once }}
      {...props}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {displayText}
        {showCursor && (
          <motion.span
            variants={cursorVariants}
            animate="blinking"
            className={cn(
              'inline-block ms-1 font-normal text-foreground select-none w-px',
              cursorClassName,
            )}
          >
            {cursor}
          </motion.span>
        )}
      </span>
    </MotionComponent>
  );
}
