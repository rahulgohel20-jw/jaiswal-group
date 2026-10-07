import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Persists filters/selections when returning from child actions/routes,
 * but clears them when arriving fresh from another sidebar module.
 */
export function useModuleState(moduleKey, initialValues, childRoutePrefixes = []) {
    const location = useLocation();
    const storageKey = `ERP_MODULE_${moduleKey}`;
    const lastPathKey = `ERP_LAST_PATH_${moduleKey}`;

    const [state, setState] = useState(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            const lastPath = sessionStorage.getItem(lastPathKey) || '';

            if (raw) {
                const parsed = JSON.parse(raw);

                // Check if returning from a child route (e.g., /generate-grn-invoice or /edit)
                const isFromChildRoute = childRoutePrefixes.some((prefix) =>
                    lastPath.includes(prefix)
                );
                
                const hasExplicitFlag = Boolean(
                    location.state?.fromChild || 
                    location.state?.preserveFilter || 
                    window.history.state?.usr?.fromChild
                );

                // If coming back from the child generator screen, KEEP the state
                if (isFromChildRoute || hasExplicitFlag) {
                    return parsed;
                }

                // If coming from another module entirely (e.g. Purchase Order -> Purchase Invoice)
                // Clear state
                sessionStorage.removeItem(storageKey);
                return initialValues;
            }
        } catch (e) {
            console.error('Failed to parse module state:', e);
        }
        return initialValues;
    });

    // 1. Persist state on change
    useEffect(() => {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(state));
        } catch (e) {
            console.error('Failed to persist module state:', e);
        }
    }, [storageKey, state]);

    // 2. Track current location so when user goes to child route and comes back, we know where they came from
    useEffect(() => {
        return () => {
            sessionStorage.setItem(lastPathKey, location.pathname);
        };
    }, [lastPathKey, location.pathname]);

    const resetModuleState = () => {
        sessionStorage.removeItem(storageKey);
        setState(initialValues);
    };

    return [state, setState, resetModuleState];
}

export default useModuleState;