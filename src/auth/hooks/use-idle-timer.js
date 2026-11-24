import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { isTokenExpired } from '@/auth/lib/helpers';
import { toast } from 'sonner';

// Default idle timeout: 30 minutes (in milliseconds)
const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000;

/**
 * Hook to automatically log out a user when inactive or when token expires.
 *
 * @param {number} timeoutMs - Duration of inactivity in milliseconds before auto-logout
 */
export function useIdleTimer(timeoutMs = DEFAULT_IDLE_TIMEOUT) {
  const { auth, logout } = useAuth();
  const timerRef = useRef(null);
  const lastActiveRef = useRef(Date.now());
  const throttleRef = useRef(0);

  const handleLogout = useCallback(
    (reason = 'Session expired due to inactivity. Please log in again.') => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      logout();
      toast.error(reason, { id: 'auth-session-timeout' });
    },
    [logout]
  );

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (auth?.token) {
      // If token itself is already expired, logout immediately
      if (isTokenExpired(auth.token)) {
        handleLogout('Your session has expired. Please log in again.');
        return;
      }

      timerRef.current = setTimeout(() => {
        handleLogout('Session expired due to inactivity. Please log in again.');
      }, timeoutMs);
    }
  }, [auth, timeoutMs, handleLogout]);

  // Throttled event listener so we don't recalculate timers on every pixel of mouse movement
  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - throttleRef.current > 1000) {
      throttleRef.current = now;
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    if (!auth?.token) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Initial check & timer start
    resetTimer();

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // When the user returns to the tab/window after being away
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const idleDuration = Date.now() - lastActiveRef.current;
        if (idleDuration >= timeoutMs) {
          handleLogout('Session expired due to inactivity while away.');
        } else if (isTokenExpired(auth?.token)) {
          handleLogout('Your session has expired. Please log in again.');
        } else {
          resetTimer();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [auth, timeoutMs, handleActivity, resetTimer, handleLogout]);
}
