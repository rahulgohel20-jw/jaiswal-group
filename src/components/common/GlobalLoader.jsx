'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export function GlobalLoader() {
  const [loading, setLoading] = useState(false);
  const showTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const show = () => {
      console.log("[GlobalLoader] Received show-global-loader event");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      showTimeRef.current = Date.now();
      setLoading(true);
    };

    const hide = () => {
      console.log("[GlobalLoader] Received hide-global-loader event");
      const elapsed = Date.now() - showTimeRef.current;
      const minDuration = 500; // minimum duration in ms to avoid flickering

      if (elapsed < minDuration) {
        const remaining = minDuration - elapsed;
        console.log(`[GlobalLoader] Delaying unmount by ${remaining}ms to prevent flicker`);
        timeoutRef.current = setTimeout(() => {
          setLoading(false);
        }, remaining);
      } else {
        setLoading(false);
      }
    };

    window.addEventListener('show-global-loader', show);
    window.addEventListener('hide-global-loader', hide);

    return () => {
      window.removeEventListener('show-global-loader', show);
      window.removeEventListener('hide-global-loader', hide);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/45 backdrop-blur-[2px] transition-all duration-300">
      <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-[280px] w-full mx-4">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#084E92] stroke-[2.5]" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-800 text-sm">Processing request</p>
          <p className="text-xs text-gray-500 mt-1">Please wait a moment...</p>
        </div>
      </div>
    </div>
  );
}

export default GlobalLoader;
