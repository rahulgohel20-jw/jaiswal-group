import { getData, setData } from '@/lib/storage';
import { jwtDecode } from 'jwt-decode';

const OLD_AUTH_KEYS = ['metronic-tailwind-react-auth-v9.2.6'];
const AUTH_LOCAL_STORAGE_KEY = 'jaiswal-group-auth';

/**
 * Checks whether a given JWT string is expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const decoded = jwtDecode(token);
    if (!decoded?.exp) return false;
    // decoded.exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= decoded.exp * 1000;
  } catch {
    return true;
  }
};

/**
 * Get stored auth information from local storage
 */
const getAuth = () => {
  try {
    let auth = getData(AUTH_LOCAL_STORAGE_KEY);
    if (!auth) {
      for (const oldKey of OLD_AUTH_KEYS) {
        const legacyAuth = getData(oldKey);
        if (legacyAuth) {
          auth = legacyAuth;
          setData(AUTH_LOCAL_STORAGE_KEY, auth);
          localStorage.removeItem(oldKey);
          break;
        }
      }
    }

    if (auth?.token && isTokenExpired(auth.token)) {
      removeAuth();
      return undefined;
    }

    return auth;
  } catch (error) {
    console.error('AUTH LOCAL STORAGE PARSE ERROR', error);
  }
};

const setAuth = (auth) => {
  setData(AUTH_LOCAL_STORAGE_KEY, auth);
};

/**
 * Remove auth information from local storage
 */
const removeAuth = () => {
  if (typeof window === 'undefined' || !localStorage) {
    return;
  }

  try {
    localStorage.removeItem(AUTH_LOCAL_STORAGE_KEY);
    OLD_AUTH_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('authToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    localStorage.removeItem('userId');
    sessionStorage.clear();
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error);
  }
};

export { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth, setAuth };

