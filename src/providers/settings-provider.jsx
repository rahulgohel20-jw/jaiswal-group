'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { APP_SETTINGS } from '@/config/settings.config';

const SettingsContext = createContext(undefined);

const LOCAL_STORAGE_PREFIX = 'app_settings_';

// Utility to safely access localStorage
const isBrowser = () => typeof window !== 'undefined';

function getFromPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function setToPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const lastObj = keys.reduce((acc, key) => (acc[key] ??= {}), obj);
  lastObj[lastKey] = value;
  return { ...obj };
}

function storeLeaf(path, value) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${path}`,
      JSON.stringify(value),
    );
  } catch (err) {
    console.error('LocalStorage write error:', err);
  }
}

function getLeafFromStorage(path) {
  if (!isBrowser()) return undefined;
  try {
    const item = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${path}`);
    return item ? JSON.parse(item) : undefined;
  } catch (err) {
    console.error('LocalStorage read error:', err);
    return undefined;
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(structuredClone(APP_SETTINGS));

  // Load settings from localStorage after mount
  useEffect(() => {
    if (!isBrowser()) return;

    const init = structuredClone(APP_SETTINGS);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LOCAL_STORAGE_PREFIX))
      .forEach((key) => {
        const path = key.replace(LOCAL_STORAGE_PREFIX, '');
        const value = getLeafFromStorage(path);
        if (value !== undefined) {
          setToPath(init, path, value);
        }
      });
    setSettings(init);
  }, []); // Empty dependency array to run once on mount

  const getOption = useCallback(
    (path) => {
      return getFromPath(settings, path);
    },
    [settings],
  );

  const setOption = useCallback((path, value) => {
    setSettings((prev) => setToPath({ ...prev }, path, value));
  }, []);

  const storeOption = useCallback((path, value) => {
    setSettings((prev) => {
      const newSettings = setToPath({ ...prev }, path, value);
      storeLeaf(path, value);
      return newSettings;
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ getOption, setOption, storeOption, settings }),
    [getOption, setOption, storeOption, settings],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return ctx;
};
