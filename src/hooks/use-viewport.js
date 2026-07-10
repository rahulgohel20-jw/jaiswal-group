import { useEffect, useState } from 'react';

export function useViewport() {
  const [dimensions, setDimensions] = useState([
    window.innerHeight,
    window.innerWidth,
  ]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions([window.innerHeight, window.innerWidth]);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return dimensions;
}
