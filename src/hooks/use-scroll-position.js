import { useEffect, useState } from 'react';

export function useScrollPosition({ targetRef } = {}) {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    // If the ref is not provided or its current value is null, fall back to document
    const target = targetRef?.current || document;
    const scrollable = target === document ? window : target;

    const updatePosition = () => {
      // Determine if we're scrolling the document or a specific element
      const scrollY = target === document ? window.scrollY : target.scrollTop;
      setScrollPosition(scrollY);
    };

    scrollable.addEventListener('scroll', updatePosition);

    // Set the initial position
    updatePosition();

    return () => {
      scrollable.removeEventListener('scroll', updatePosition);
    };
  }, [targetRef]);

  return scrollPosition;
}
