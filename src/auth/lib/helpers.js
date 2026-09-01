import { getData, setData } from '@/lib/storage';

const OLD_AUTH_KEYS = ['metronic-tailwind-react-auth-v9.2.6'];
const AUTH_LOCAL_STORAGE_KEY = 'jaiswal-group-auth';

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
  if (!localStorage) {
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
  } catch (error) {
    console.error('AUTH LOCAL STORAGE REMOVE ERROR', error);
  }
};

export { AUTH_LOCAL_STORAGE_KEY, getAuth, removeAuth, setAuth };
